import { getPool } from '../db/connection.js';
import { getAIClient, generateContentWithErrorHandling } from './geminiService.js';

export interface CodeIssue {
  type: 'error' | 'warning' | 'suggestion' | 'gap' | 'security' | 'performance' | 'best_practice';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  column?: number;
  message: string;
  description: string;
  suggestion?: string;
  fixedCode?: string;
}

export interface CodeAnalysisResult {
  score: number; // 0-100
  issues: CodeIssue[];
  summary: string;
  recommendations: string[];
  executionResults?: {
    status: string;
    output?: string;
    error?: string;
    executionTime?: number;
  };
}

// Code analysis service
export const codeAnalysisService = {
  /**
   * Analyze code for issues, gaps, problems, and suggest fixes
   */
  async analyzeCode(
    codeGenerationId: number,
    userId: number,
    options?: { includeExecution?: boolean; fixIssues?: boolean }
  ): Promise<CodeAnalysisResult> {
    const pool = getPool();

    // Get code generation
    const [generations] = await pool.query(
      `SELECT cg.*, a.name as algorithm_name, a.description as algorithm_description,
              a.steps as algorithm_steps, a.pseudo_code as algorithm_pseudo_code
       FROM code_generations cg
       JOIN algorithms a ON cg.algorithm_id = a.id
       WHERE cg.id = ? AND cg.user_id = ?`,
      [codeGenerationId, userId]
    ) as any[];

    if (generations.length === 0) {
      throw new Error('Code generation not found');
    }

    const generation = generations[0];
    const algorithm = {
      name: generation.algorithm_name,
      description: generation.algorithm_description,
      steps: typeof generation.algorithm_steps === 'string' 
        ? JSON.parse(generation.algorithm_steps) 
        : generation.algorithm_steps,
      pseudo_code: generation.algorithm_pseudo_code
    };

    // Execute code if requested
    let executionResults = null;
    if (options?.includeExecution) {
      try {
        const { codeExecutionService } = await import('./codeExecution.js');
        const execResult = await codeExecutionService.executeCode(
          codeGenerationId,
          userId,
          undefined,
          { timeout: 10000 }
        );
        executionResults = {
          status: execResult.status,
          output: execResult.output,
          error: execResult.error
        };
      } catch (error: any) {
        executionResults = {
          status: 'failed',
          error: error.message
        };
      }
    }

    // Analyze code using AI
    const analysis = await this._analyzeWithAI(
      generation.code,
      generation.language,
      algorithm,
      executionResults
    );

    // Generate fixes if requested
    if (options?.fixIssues && analysis.issues.length > 0) {
      const fixedCode = await this._generateFixes(
        generation.code,
        generation.language,
        analysis.issues
      );
      
      // Update code generation with fixed code
      await pool.query(
        `UPDATE code_generations 
         SET code = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [fixedCode, codeGenerationId]
      );
      
      // Note: fixedCode is stored in the database, not in the analysis result
    }

    // Save analysis results
    await pool.query(
      `INSERT INTO code_analysis 
       (code_generation_id, user_id, analysis_result, score, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        codeGenerationId,
        userId,
        JSON.stringify(analysis),
        analysis.score
      ]
    );

    return {
      ...analysis,
      executionResults: executionResults || undefined
    };
  },

  /**
   * Analyze code with AI
   */
  async _analyzeWithAI(
    code: string,
    language: string,
    algorithm: any,
    executionResults: any
  ): Promise<CodeAnalysisResult> {
    const prompt = this._buildAnalysisPrompt(code, language, algorithm, executionResults);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          score: { 
            type: "number", 
            description: "Code quality score from 0-100" 
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["error", "warning", "suggestion", "gap", "security", "performance", "best_practice"],
                  description: "Type of issue"
                },
                severity: {
                  type: "string",
                  enum: ["critical", "high", "medium", "low"],
                  description: "Severity level"
                },
                line: { type: "number", description: "Line number (if applicable)" },
                column: { type: "number", description: "Column number (if applicable)" },
                message: { type: "string", description: "Brief issue message" },
                description: { type: "string", description: "Detailed description" },
                suggestion: { type: "string", description: "How to fix this issue" },
                fixedCode: { type: "string", description: "Fixed code snippet (if applicable)" }
              },
              required: ["type", "severity", "message", "description"]
            }
          },
          summary: {
            type: "string",
            description: "Overall code quality summary"
          },
          recommendations: {
            type: "array",
            items: { type: "string" },
            description: "General recommendations for improvement"
          }
        },
        required: ["score", "issues", "summary", "recommendations"]
      }
    });

    return {
      score: response.score || 0,
      issues: response.issues || [],
      summary: response.summary || '',
      recommendations: response.recommendations || []
    };
  },

  /**
   * Generate fixes for identified issues
   */
  async _generateFixes(
    code: string,
    language: string,
    issues: CodeIssue[]
  ): Promise<string> {
    const criticalIssues = issues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    );

    if (criticalIssues.length === 0) {
      return code; // No critical issues to fix
    }

    const prompt = `You are an expert ${language} developer. Fix the following code issues to make it flawless.

Current Code:
\`\`\`${language}
${code}
\`\`\`

Issues to Fix:
${criticalIssues.map((issue, i) => `
${i + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}
   Description: ${issue.description}
   ${issue.suggestion ? `Suggestion: ${issue.suggestion}` : ''}
   ${issue.line ? `Location: Line ${issue.line}` : ''}
`).join('\n')}

Requirements:
1. Fix ALL identified issues
2. Maintain the original algorithm logic and functionality
3. Follow ${language} best practices
4. Add proper error handling where needed
5. Improve code quality, readability, and maintainability
6. Ensure the code is production-ready and flawless

Return ONLY the complete fixed code, no explanations.`;

    const client = await getAIClient(userId);
    
    // For text responses, use the AI client directly
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "text/plain"
        }
      });

      if (!response.text) {
        throw new Error("No response from AI");
      }

      return response.text;
    } catch (error: any) {
      console.error('[CodeAnalysis] Error generating fixes:', error);
      throw new Error(`Failed to generate fixes: ${error.message || 'Unknown error'}`);
    }
  },

  /**
   * Build analysis prompt
   */
  _buildAnalysisPrompt(
    code: string,
    language: string,
    algorithm: any,
    executionResults: any
  ): string {
    let prompt = `You are an expert ${language} code reviewer and quality analyst. Analyze the following code implementation of a bio-inspired algorithm and identify ALL issues, gaps, problems, and areas for improvement.

Algorithm Context:
- Name: ${algorithm.name}
- Description: ${algorithm.description}
- Steps: ${algorithm.steps.join(' -> ')}
- Pseudocode: ${algorithm.pseudo_code}

Code to Analyze:
\`\`\`${language}
${code}
\`\`\``;

    if (executionResults) {
      prompt += `\n\nExecution Results:
- Status: ${executionResults.status}
${executionResults.output ? `- Output: ${executionResults.output}` : ''}
${executionResults.error ? `- Error: ${executionResults.error}` : ''}`;
    }

    prompt += `\n\nAnalyze the code for:

1. **Syntax Errors**: Any syntax mistakes that prevent compilation/execution
2. **Logic Errors**: Bugs, incorrect algorithm implementation, wrong calculations
3. **Runtime Errors**: Potential crashes, exceptions, null pointer errors
4. **Security Issues**: Vulnerabilities, injection risks, unsafe operations
5. **Performance Issues**: Inefficient algorithms, memory leaks, unnecessary computations
6. **Code Quality**: Poor naming, lack of comments, code duplication, complexity
7. **Best Practices**: Not following ${language} conventions, anti-patterns
8. **Gaps**: Missing error handling, missing edge cases, incomplete implementation
9. **Maintainability**: Hard to read, hard to test, hard to extend
10. **Algorithm Fidelity**: Does it correctly implement the bio-inspired algorithm?

For each issue found, provide:
- Type: error/warning/suggestion/gap/security/performance/best_practice
- Severity: critical/high/medium/low
- Line/Column: Where the issue is (if applicable)
- Message: Brief description
- Description: Detailed explanation
- Suggestion: How to fix it
- Fixed Code: Code snippet showing the fix (if applicable)

Also provide:
- Overall quality score (0-100)
- Summary of code quality
- General recommendations for improvement

Be thorough and identify ALL issues to make this code flawless.`;

    return prompt;
  },

  /**
   * Get analysis history for a code generation
   */
  async getAnalysisHistory(
    codeGenerationId: number,
    userId: number,
    limit: number = 10
  ): Promise<any[]> {
    const pool = getPool();

    const [analyses] = await pool.query(
      `SELECT * FROM code_analysis
       WHERE code_generation_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [codeGenerationId, userId, limit]
    ) as any[];

    return analyses.map((analysis: any) => ({
      ...analysis,
      analysis_result: typeof analysis.analysis_result === 'string' 
        ? JSON.parse(analysis.analysis_result) 
        : analysis.analysis_result
    }));
  },

  /**
   * Get latest analysis for a code generation
   */
  async getLatestAnalysis(
    codeGenerationId: number,
    userId: number
  ): Promise<CodeAnalysisResult | null> {
    const pool = getPool();

    const [analyses] = await pool.query(
      `SELECT * FROM code_analysis
       WHERE code_generation_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [codeGenerationId, userId]
    ) as any[];

    if (analyses.length === 0) {
      return null;
    }

    const analysis = analyses[0];
    return {
      ...(typeof analysis.analysis_result === 'string' 
        ? JSON.parse(analysis.analysis_result) 
        : analysis.analysis_result),
      score: analysis.score
    };
  }
};

