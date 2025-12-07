import { getPool } from '../db/connection.js';
import { getAIClient, generateContentWithErrorHandling, DEFAULT_MODEL } from './geminiService.js';

// AI-powered recommendations service
export const recommendationsService = {
  /**
   * Get algorithm recommendations for a problem
   */
  async recommendAlgorithmsForProblem(
    problemId: number,
    userId: number,
    limit: number = 5
  ): Promise<any[]> {
    const pool = getPool();

    // Get problem details
    const [problems] = await pool.query(
      `SELECT * FROM problems WHERE id = ? AND user_id = ?`,
      [problemId, userId]
    ) as any[];

    if (problems.length === 0) {
      throw new Error('Problem not found');
    }

    const problem = problems[0];

    // Get user's algorithms
    const [userAlgorithms] = await pool.query(
      `SELECT id, name, domain, description, type, view_count, like_count
       FROM algorithms
       WHERE user_id = ? OR visibility = 'public'
       ORDER BY like_count DESC, view_count DESC
       LIMIT 100`,
      [userId]
    ) as any[];

    // Use AI to recommend algorithms
    const prompt = this._buildProblemRecommendationPrompt(problem, userAlgorithms);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                algorithmId: { type: "number" },
                confidenceScore: { type: "number" },
                reason: { type: "string" }
              },
              required: ["algorithmId", "confidenceScore", "reason"]
            }
          }
        },
        required: ["recommendations"]
      }
    });

    // Save recommendations
    const savedRecommendations = [];
    for (const rec of (response.recommendations as any[]).slice(0, limit)) {
      const [result] = await pool.query(
        `INSERT INTO algorithm_recommendations
         (user_id, problem_id, recommendation_type, recommended_algorithm_id, confidence_score, reason)
         VALUES (?, ?, 'algorithm_suggestion', ?, ?, ?)`,
        [userId, problemId, rec.algorithmId, rec.confidenceScore, rec.reason]
      ) as any[];

      savedRecommendations.push({
        id: result.insertId,
        algorithmId: rec.algorithmId,
        confidenceScore: rec.confidenceScore,
        reason: rec.reason
      });
    }

    return savedRecommendations;
  },

  /**
   * Get optimization recommendations
   */
  async recommendOptimizations(
    algorithmId: number,
    userId: number
  ): Promise<any[]> {
    const pool = getPool();

    // Get algorithm details
    const [algorithms] = await pool.query(
      `SELECT a.*, 
       (SELECT AVG(overall_score) FROM algorithm_scores WHERE algorithm_id = a.id) as avg_score,
       (SELECT COUNT(*) FROM algorithm_gaps WHERE algorithm_id = a.id AND status != 'resolved') as gap_count
       FROM algorithms a
       WHERE a.id = ? AND a.user_id = ?`,
      [algorithmId, userId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    const algorithm = algorithms[0];
    const steps = typeof algorithm.steps === 'string' 
      ? JSON.parse(algorithm.steps) 
      : algorithm.steps;

    // Get existing improvements
    const [improvements] = await pool.query(
      `SELECT * FROM algorithm_improvements
       WHERE algorithm_id = ? AND status != 'completed'
       ORDER BY priority DESC`,
      [algorithmId]
    ) as any[];

    // Get gaps
    const [gaps] = await pool.query(
      `SELECT * FROM algorithm_gaps
       WHERE algorithm_id = ? AND status != 'resolved'
       ORDER BY severity DESC`,
      [algorithmId]
    ) as any[];

    // Use AI to recommend optimizations
    const prompt = this._buildOptimizationPrompt(algorithm, steps, improvements, gaps);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          optimizations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                expectedBenefit: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                confidenceScore: { type: "number" }
              },
              required: ["title", "description", "expectedBenefit", "priority"]
            }
          }
        },
        required: ["optimizations"]
      }
    });

    // Save recommendations
    const savedOptimizations = [];
    for (const opt of response.optimizations) {
      const [result] = await pool.query(
        `INSERT INTO algorithm_recommendations
         (user_id, algorithm_id, recommendation_type, confidence_score, reason, context)
         VALUES (?, ?, 'optimization', ?, ?, ?)`,
        [
          userId,
          algorithmId,
          opt.confidenceScore || 75,
          opt.description,
          JSON.stringify({
            title: opt.title,
            expectedBenefit: opt.expectedBenefit,
            priority: opt.priority
          })
        ]
      ) as any[];

      savedOptimizations.push({
        id: result.insertId,
        ...opt
      });
    }

    return savedOptimizations;
  },

  /**
   * Get similar algorithms
   */
  async findSimilarAlgorithms(
    algorithmId: number,
    userId: number,
    limit: number = 5
  ): Promise<any[]> {
    const pool = getPool();

    // Get algorithm details
    const [algorithms] = await pool.query(
      `SELECT * FROM algorithms WHERE id = ?`,
      [algorithmId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    const algorithm = algorithms[0];

    // Find similar algorithms
    const [similar] = await pool.query(
      `SELECT id, name, domain, description, type, 
       CASE 
         WHEN domain = ? THEN 10
         WHEN type = ? THEN 5
         ELSE 0
       END as similarity_score
       FROM algorithms
       WHERE id != ? AND (visibility = 'public' OR user_id = ?)
       ORDER BY similarity_score DESC, like_count DESC
       LIMIT ?`,
      [algorithm.domain, algorithm.type, algorithmId, userId, limit * 2]
    ) as any[];

    // Use AI to refine similarity
    const prompt = this._buildSimilarityPrompt(algorithm, similar);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          similar: {
            type: "array",
            items: {
              type: "object",
              properties: {
                algorithmId: { type: "number" },
                similarityScore: { type: "number" },
                reason: { type: "string" }
              }
            }
          }
        },
        required: ["similar"]
      }
    });

    // Save recommendations
    const savedSimilar = [];
    for (const sim of response.similar.slice(0, limit)) {
      const [result] = await pool.query(
        `INSERT INTO algorithm_recommendations
         (user_id, algorithm_id, recommendation_type, recommended_algorithm_id, confidence_score, reason)
         VALUES (?, ?, 'similar_algorithm', ?, ?, ?)
         ON DUPLICATE KEY UPDATE confidence_score = VALUES(confidence_score)`,
        [userId, algorithmId, sim.algorithmId, sim.similarityScore, sim.reason]
      ) as any[];

      savedSimilar.push({
        id: result.insertId,
        ...sim
      });
    }

    return savedSimilar;
  },

  /**
   * Get user recommendations
   */
  async getUserRecommendations(
    userId: number,
    limit: number = 10
  ): Promise<any[]> {
    const pool = getPool();

    const [recommendations] = await pool.query(
      `SELECT r.*, 
       a.name as algorithm_name, a.domain as algorithm_domain,
       ra.name as recommended_algorithm_name,
       p.title as problem_title
       FROM algorithm_recommendations r
       LEFT JOIN algorithms a ON r.algorithm_id = a.id
       LEFT JOIN algorithms ra ON r.recommended_algorithm_id = ra.id
       LEFT JOIN problems p ON r.problem_id = p.id
       WHERE r.user_id = ? AND r.is_viewed = FALSE
       ORDER BY r.confidence_score DESC, r.created_at DESC
       LIMIT ?`,
      [userId, limit]
    ) as any[];

    return recommendations.map((rec: any) => ({
      ...rec,
      context: rec.context ? JSON.parse(rec.context) : null
    }));
  },

  /**
   * Mark recommendation as viewed
   */
  async markViewed(recommendationId: number, userId: number): Promise<void> {
    const pool = getPool();

    await pool.query(
      `UPDATE algorithm_recommendations
       SET is_viewed = TRUE
       WHERE id = ? AND user_id = ?`,
      [recommendationId, userId]
    );
  },

  /**
   * Accept recommendation
   */
  async acceptRecommendation(recommendationId: number, userId: number): Promise<void> {
    const pool = getPool();

    await pool.query(
      `UPDATE algorithm_recommendations
       SET is_accepted = TRUE, is_viewed = TRUE
       WHERE id = ? AND user_id = ?`,
      [recommendationId, userId]
    );
  },

  /**
   * Build problem recommendation prompt
   */
  _buildProblemRecommendationPrompt(problem: any, algorithms: any[]): string {
    return `Given the following problem, recommend the best algorithms to solve it.

Problem:
- Title: ${problem.title}
- Description: ${problem.description}
- Category: ${problem.category}
- Domain: ${problem.domain}
- Complexity: ${problem.complexity}
- Priority: ${problem.priority}

Available Algorithms (${algorithms.length}):
${algorithms.slice(0, 20).map((a: any, i: number) => 
  `${i + 1}. [ID: ${a.id}] ${a.name} - ${a.domain} - ${a.description?.substring(0, 100)}`
).join('\n')}

Recommend the top algorithms that would best solve this problem, with confidence scores and reasons.`;
  },

  /**
   * Build optimization prompt
   */
  _buildOptimizationPrompt(algorithm: any, steps: string[], improvements: any[], gaps: any[]): string {
    return `Analyze this algorithm and recommend optimizations.

Algorithm: ${algorithm.name}
Domain: ${algorithm.domain}
Description: ${algorithm.description}
Average Score: ${algorithm.avg_score || 'N/A'}
Gap Count: ${algorithm.gap_count || 0}

Steps:
${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

Existing Improvements:
${improvements.slice(0, 5).map((imp: any) => `- ${imp.title}: ${imp.description}`).join('\n')}

Identified Gaps:
${gaps.slice(0, 5).map((gap: any) => `- ${gap.gap_type} (${gap.severity}): ${gap.description}`).join('\n')}

Recommend specific optimizations with expected benefits and priorities.`;
  },

  /**
   * Build similarity prompt
   */
  _buildSimilarityPrompt(algorithm: any, candidates: any[]): string {
    return `Find algorithms similar to this one.

Target Algorithm:
- Name: ${algorithm.name}
- Domain: ${algorithm.domain}
- Description: ${algorithm.description}
- Type: ${algorithm.type}

Candidate Algorithms:
${candidates.map((c: any, i: number) => 
  `${i + 1}. [ID: ${c.id}] ${c.name} - ${c.domain} - ${c.description?.substring(0, 100)}`
).join('\n')}

Identify the most similar algorithms with similarity scores and reasons.`;
  }
};

