import { getPool } from '../db/connection.js';
import { processGenerateJob, processSynthesizeJob, processAnalyzeJob } from './aiProcessor.js';
import { AUTOMATION_CONFIG, SYSTEM_USER } from '../constants.js';
import bcrypt from 'bcryptjs';
import { Type } from "@google/genai";
import { getAIClient as getPackageAIClient } from './geminiService.js';

// Internal method - Get or create system user
async function _getSystemUser(): Promise<number> {
  const pool = getPool();
  
  // Try to find system user
  const [users] = await pool.query(
    `SELECT id FROM users WHERE email = ?`,
    [SYSTEM_USER.EMAIL]
  ) as any[];
  
  if (users.length > 0) {
    return users[0].id;
  }
  
  // Create system user if doesn't exist
  // Generate a secure random password hash (system user won't login via password)
  const randomPassword = `system_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)`,
    [
      SYSTEM_USER.EMAIL,
      passwordHash,
      SYSTEM_USER.NAME,
      SYSTEM_USER.ROLE
    ]
  ) as any[];
  
  return result.insertId;
}

// Internal method - Get AI-generated problem idea
async function _generateProblemIdea(systemUserId: number): Promise<{ domain: string; inspiration: string; category: string }> {
  const pool = getPool();
  
  // First, try to get an unsolved problem from the database
  const [userProblems] = await pool.query(
    `SELECT title, description, domain, category, priority
    FROM problems
    WHERE status IN ('draft', 'active')
    AND priority IN ('high', 'critical')
    ORDER BY priority DESC, created_at DESC
    LIMIT 10`
  ) as any[];
  
  // If we have user problems, randomly select one
  if (userProblems.length > 0 && Math.random() > 0.3) { // 70% chance to use user problem
    const selectedProblem = userProblems[Math.floor(Math.random() * userProblems.length)];
    
    // Use AI to suggest a bio-inspiration for this problem
    const ai = await getPackageAIClient(); // System user, no userId
    const prompt = `
      Given this problem: "${selectedProblem.title}" - ${selectedProblem.description}
      Domain: ${selectedProblem.domain || 'General'}
      Category: ${selectedProblem.category || 'General'}
      
      Suggest a specific biological or physical system/process from nature that could inspire an algorithm to solve this problem.
      Return a JSON object with:
      - inspiration: The biological/physical system (e.g., "Photosynthesis", "Immune System", "Ant Colony Foraging")
      - domain: The problem domain (use the problem's domain if provided)
      - category: A category for this problem
    `;
    
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inspiration: { type: Type.STRING },
              domain: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["inspiration", "domain", "category"]
          }
        }
      });
      
      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          domain: parsed.domain || selectedProblem.domain || 'Problem Solving',
          inspiration: parsed.inspiration,
          category: parsed.category || selectedProblem.category || 'General'
        };
      }
    } catch (error) {
      console.warn('Failed to get AI inspiration, using fallback:', error);
    }
    
    // Fallback: use problem domain and suggest a generic inspiration
    return {
      domain: selectedProblem.domain || selectedProblem.title,
      inspiration: 'Biological Systems',
      category: selectedProblem.category || 'General'
    };
  }
  
  // Otherwise, use AI to generate a completely new problem idea
  const ai = await getPackageAIClient(); // System user, no userId
  const prompt = `
    Generate a diverse, real-world problem that needs solving. Consider problems from:
    - Technology and Computing
    - Healthcare and Medicine
    - Environment and Climate
    - Education and Learning
    - Business and Economics
    - Social and Community
    - Science and Research
    - Infrastructure and Urban Planning
    - Agriculture and Food
    - Energy and Resources
    - Transportation and Logistics
    - Communication and Information
    - And any other domain
    
    Be creative and diverse. Don't limit to common problems - think of novel, interesting challenges.
    
    Also suggest a biological or physical system from nature that could inspire an algorithm to solve this problem.
    
    Return a JSON object with:
    - domain: The problem domain/area
    - inspiration: The biological/physical system (e.g., "Photosynthesis", "Neural Networks", "Swarm Behavior")
    - category: A category for this problem
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            domain: { type: Type.STRING },
            inspiration: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["domain", "inspiration", "category"]
        }
      }
    });
    
    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        domain: parsed.domain,
        inspiration: parsed.inspiration,
        category: parsed.category
      };
    }
  } catch (error) {
    console.warn('Failed to generate problem idea, using fallback:', error);
  }
  
  // Ultimate fallback: use a generic problem
  const fallbackProblems = [
    { domain: 'Optimization', inspiration: 'Evolutionary Processes', category: 'Computing' },
    { domain: 'Pattern Recognition', inspiration: 'Neural Networks', category: 'AI' },
    { domain: 'Resource Allocation', inspiration: 'Ecosystem Balance', category: 'Management' },
    { domain: 'Problem Solving', inspiration: 'Biological Systems', category: 'General' }
  ];
  
  return fallbackProblems[Math.floor(Math.random() * fallbackProblems.length)];
}

// Internal method - Get top performing algorithms for synthesis
async function _getTopAlgorithms(limit: number = 5): Promise<any[]> {
  const pool = getPool();
  
  const [algorithms] = await pool.query(
    `SELECT 
      a.id, a.name, a.inspiration, a.domain, a.description, a.principle,
      a.steps, a.applications, a.pseudo_code as pseudoCode, a.tags,
      a.type, a.parent_ids as parentIds, a.like_count as likeCount,
      a.view_count as viewCount,
      COALESCE(avg_score.avg_score, 0) as avgScore
    FROM algorithms a
    LEFT JOIN (
      SELECT algorithm_id, AVG(overall_score) as avg_score
      FROM algorithm_scores
      GROUP BY algorithm_id
    ) avg_score ON a.id = avg_score.algorithm_id
    WHERE a.visibility = 'public' OR a.user_id = (SELECT id FROM users WHERE email = ?)
    ORDER BY (a.like_count * 2 + a.view_count + COALESCE(avg_score.avg_score, 0) * 10) DESC
    LIMIT ?`,
    [SYSTEM_USER.EMAIL, limit]
  ) as any[];
  
  return algorithms.map((algo: any) => ({
    ...algo,
    steps: typeof algo.steps === 'string' ? JSON.parse(algo.steps) : algo.steps,
    applications: typeof algo.applications === 'string' ? JSON.parse(algo.applications) : algo.applications,
    tags: typeof algo.tags === 'string' ? JSON.parse(algo.tags) : algo.tags,
    parentIds: algo.parentIds ? (typeof algo.parentIds === 'string' ? JSON.parse(algo.parentIds) : algo.parentIds) : null
  }));
}

// Internal method - Get algorithms that haven't been analyzed recently
async function _getUnanalyzedAlgorithms(limit: number = 3): Promise<any[]> {
  const pool = getPool();
  
  const [algorithms] = await pool.query(
    `SELECT 
      a.id, a.name, a.inspiration, a.domain, a.description, a.principle,
      a.steps, a.applications, a.pseudo_code as pseudoCode, a.tags,
      a.type, a.parent_ids as parentIds
    FROM algorithms a
    LEFT JOIN algorithm_analysis aa ON a.id = aa.algorithm_id
    WHERE (aa.id IS NULL OR aa.created_at < DATE_SUB(NOW(), INTERVAL ? DAY))
    AND (a.visibility = 'public' OR a.user_id = (SELECT id FROM users WHERE email = ?))
    ORDER BY a.created_at DESC
    LIMIT ?`,
    [AUTOMATION_CONFIG.ANALYSIS_INTERVAL_DAYS, SYSTEM_USER.EMAIL, limit]
  ) as any[];
  
  return algorithms.map((algo: any) => ({
    ...algo,
    steps: typeof algo.steps === 'string' ? JSON.parse(algo.steps) : algo.steps,
    applications: typeof algo.applications === 'string' ? JSON.parse(algo.applications) : algo.applications,
    tags: typeof algo.tags === 'string' ? JSON.parse(algo.tags) : algo.tags,
    parentIds: algo.parentIds ? (typeof algo.parentIds === 'string' ? JSON.parse(algo.parentIds) : algo.parentIds) : null
  }));
}

// External service call - Save generated algorithm
async function _saveAlgorithm(userId: number, algorithmData: any, type: 'generated' | 'hybrid' = 'generated', parentIds?: number[]): Promise<number> {
  const pool = getPool();
  
  const [result] = await pool.query(
    `INSERT INTO algorithms 
    (user_id, name, inspiration, domain, description, principle, 
     steps, applications, pseudo_code, tags, type, parent_ids, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      algorithmData.name,
      algorithmData.inspiration,
      algorithmData.domain,
      algorithmData.description,
      algorithmData.principle,
      JSON.stringify(algorithmData.steps),
      JSON.stringify(algorithmData.applications),
      algorithmData.pseudoCode,
      JSON.stringify(algorithmData.tags),
      type,
      parentIds ? JSON.stringify(parentIds) : null,
      'public' // Auto-generated algorithms are public
    ]
  ) as any[];
  
  return result.insertId;
}

// External service call - Log automation activity
async function _logAutomationActivity(taskType: string, status: string, details: any, algorithmId?: number): Promise<void> {
  const pool = getPool();
  
  await pool.query(
    `INSERT INTO automation_logs 
    (task_type, status, details, algorithm_id, created_at)
    VALUES (?, ?, ?, ?, NOW())`,
    [
      taskType,
      status,
      JSON.stringify(details),
      algorithmId || null
    ]
  );
}

// Helper function - Format algorithm data
function _formatAlgorithmData(data: any): any {
  return {
    name: data.name,
    inspiration: data.inspiration,
    domain: data.domain,
    description: data.description,
    principle: data.principle,
    steps: Array.isArray(data.steps) ? data.steps : (typeof data.steps === 'string' ? [data.steps] : []),
    applications: Array.isArray(data.applications) ? data.applications : (typeof data.applications === 'string' ? [data.applications] : []),
    pseudoCode: data.pseudoCode || data.pseudo_code || '',
    tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? [data.tags] : [])
  };
}

// Main automation function - Generate daily algorithms
export async function generateDailyAlgorithms(): Promise<void> {
  try {
    console.log('🤖 Starting daily algorithm generation...');
    
    const systemUserId = await _getSystemUser();
    
    // Generate algorithms per day - considering all types of problems
    const numAlgorithms = Math.floor(Math.random() * (AUTOMATION_CONFIG.DAILY_ALGORITHMS_MAX - AUTOMATION_CONFIG.DAILY_ALGORITHMS_MIN + 1)) + AUTOMATION_CONFIG.DAILY_ALGORITHMS_MIN;
    
    for (let i = 0; i < numAlgorithms; i++) {
      try {
        // Generate a diverse problem idea (from database or AI-generated)
        const currentProblem = await _generateProblemIdea(systemUserId);
        
        // Generate algorithm
        const algorithmData = await processGenerateJob({
          inspiration: currentProblem.inspiration,
          domain: `${currentProblem.domain} - ${currentProblem.category}`
        }, systemUserId);
        
        // Format and save
        const formattedData = _formatAlgorithmData(algorithmData);
        const algorithmId = await _saveAlgorithm(systemUserId, formattedData, 'generated');
        
        await _logAutomationActivity(
          'daily_generation',
          'success',
          {
            problem: currentProblem,
            algorithmId,
            algorithmName: formattedData.name
          },
          algorithmId
        );
        
        console.log(`✅ Generated algorithm: ${formattedData.name} (ID: ${algorithmId})`);
        
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`❌ Error generating algorithm ${i + 1}:`, error.message);
        await _logAutomationActivity(
          'daily_generation',
          'failed',
          { error: error.message, attempt: i + 1 }
        );
      }
    }
    
    console.log('✅ Daily algorithm generation completed');
  } catch (error: any) {
    console.error('❌ Fatal error in daily algorithm generation:', error);
    throw error;
  }
}

// Main automation function - Auto-synthesize algorithms
export async function autoSynthesizeAlgorithms(): Promise<void> {
  try {
    console.log('🔬 Starting auto-synthesis of algorithms...');
    
    const systemUserId = await _getSystemUser();
    
    // Get top performing algorithms
    const topAlgorithms = await _getTopAlgorithms(AUTOMATION_CONFIG.TOP_ALGORITHMS_FOR_SYNTHESIS);
    
    if (topAlgorithms.length < 2) {
      console.log('⚠️  Not enough algorithms for synthesis');
      return;
    }
    
    // Generate hybrid algorithms per day
    const numSyntheses = Math.floor(Math.random() * (AUTOMATION_CONFIG.DAILY_SYNTHESES_MAX - AUTOMATION_CONFIG.DAILY_SYNTHESES_MIN + 1)) + AUTOMATION_CONFIG.DAILY_SYNTHESES_MIN;
    
    for (let i = 0; i < numSyntheses; i++) {
      try {
        // Select 2-3 random algorithms from top performers
        const numParents = Math.floor(Math.random() * 2) + 2; // 2-3 parents
        const selectedAlgorithms = topAlgorithms
          .sort(() => Math.random() - 0.5)
          .slice(0, numParents);
        
        // Find a common problem domain
        const domains = selectedAlgorithms.map(a => a.domain);
        const focusDomain = domains[0] || 'Complex Problem Solving';
        
        // Synthesize
        const hybridData = await processSynthesizeJob({
          algorithms: selectedAlgorithms,
          focus: `Create a hybrid system to solve complex problems in ${focusDomain}`
        }, systemUserId);
        
        // Format and save
        const formattedData = _formatAlgorithmData(hybridData);
        const parentIds = selectedAlgorithms.map(a => a.id);
        const algorithmId = await _saveAlgorithm(
          systemUserId,
          formattedData,
          'hybrid',
          parentIds
        );
        
        await _logAutomationActivity(
          'auto_synthesis',
          'success',
          {
            parentIds,
            algorithmId,
            algorithmName: formattedData.name,
            focusDomain
          },
          algorithmId
        );
        
        console.log(`✅ Synthesized algorithm: ${formattedData.name} (ID: ${algorithmId})`);
        
        // Small delay between syntheses
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        console.error(`❌ Error synthesizing algorithm ${i + 1}:`, error.message);
        await _logAutomationActivity(
          'auto_synthesis',
          'failed',
          { error: error.message, attempt: i + 1 }
        );
      }
    }
    
    console.log('✅ Auto-synthesis completed');
  } catch (error: any) {
    console.error('❌ Fatal error in auto-synthesis:', error);
    throw error;
  }
}

// Main automation function - Improve existing algorithms
export async function improveAlgorithms(): Promise<void> {
  try {
    console.log('🔧 Starting algorithm improvement process...');
    
    const systemUserId = await _getSystemUser();
    
    // Get algorithms that need analysis
    const unanalyzedAlgorithms = await _getUnanalyzedAlgorithms(AUTOMATION_CONFIG.UNANALYZED_ALGORITHMS_LIMIT);
    
    if (unanalyzedAlgorithms.length === 0) {
      console.log('⚠️  No algorithms need improvement analysis');
      return;
    }
    
    for (const algorithm of unanalyzedAlgorithms) {
      try {
        // Perform blind spot analysis
        const analysis = await processAnalyzeJob({
          algorithmId: algorithm.id,
          analysisType: 'blind_spot'
        }, systemUserId);
        
        // If critical issues found, perform extension analysis
        if (analysis.risks && analysis.risks.some((r: any) => r.severity === 'High')) {
          const extensionAnalysis = await processAnalyzeJob({
            algorithmId: algorithm.id,
            analysisType: 'extension'
          }, systemUserId);
          
          // Log improvement suggestions
          await _logAutomationActivity(
            'algorithm_improvement',
            'analysis_complete',
            {
              algorithmId: algorithm.id,
              algorithmName: algorithm.name,
              risks: analysis.risks,
              improvements: extensionAnalysis.ideas
            },
            algorithm.id
          );
          
          console.log(`✅ Analyzed algorithm: ${algorithm.name} (ID: ${algorithm.id})`);
        }
        
        // Small delay between analyses
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`❌ Error improving algorithm ${algorithm.id}:`, error.message);
        await _logAutomationActivity(
          'algorithm_improvement',
          'failed',
          { error: error.message, algorithmId: algorithm.id }
        );
      }
    }
    
    console.log('✅ Algorithm improvement process completed');
  } catch (error: any) {
    console.error('❌ Fatal error in algorithm improvement:', error);
    throw error;
  }
}

// Main automation function - Run all daily tasks
export async function runDailyAutomation(): Promise<void> {
  try {
    console.log('🚀 Starting daily automation cycle...');
    
    // Run all automation tasks
    await generateDailyAlgorithms();
    await autoSynthesizeAlgorithms();
    await improveAlgorithms();
    
    console.log('✅ Daily automation cycle completed successfully');
  } catch (error: any) {
    console.error('❌ Error in daily automation cycle:', error);
    throw error;
  }
}

