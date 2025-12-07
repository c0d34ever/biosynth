import { getPool } from '../db/connection.js';
import { getAIClient, generateContentWithErrorHandling, DEFAULT_MODEL } from './geminiService.js';

// Supported languages
export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'typescript' | 'go' | 'rust';

// Code generation service
export const codeGenerationService = {
  /**
   * Generate code implementation from algorithm
   */
  async generateCode(
    algorithmId: number,
    userId: number,
    language: SupportedLanguage,
    options?: { version?: string }
  ): Promise<{ id: number; code: string; language: string }> {
    const pool = getPool();

    // Get algorithm details
    const [algorithms] = await pool.query(
      `SELECT name, description, principle, steps, pseudo_code, domain, inspiration
       FROM algorithms WHERE id = ? AND user_id = ?`,
      [algorithmId, userId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    const algorithm = algorithms[0];
    const steps = typeof algorithm.steps === 'string' 
      ? JSON.parse(algorithm.steps) 
      : algorithm.steps;

    // Generate code using AI
    const prompt = this._buildCodeGenerationPrompt(algorithm, steps, language);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "Generated code implementation" },
          explanation: { type: "string", description: "Brief explanation of the implementation" },
          dependencies: { type: "array", items: { type: "string" }, description: "Required dependencies" }
        },
        required: ["code"]
      }
    });

    // Save code generation
    const [result] = await pool.query(
      `INSERT INTO code_generations 
       (algorithm_id, user_id, language, code, version)
       VALUES (?, ?, ?, ?, ?)`,
      [
        algorithmId,
        userId,
        language,
        response.code,
        options?.version || '1.0.0'
      ]
    ) as any[];

    return {
      id: result.insertId,
      code: response.code,
      language
    };
  },

  /**
   * Get code generations for an algorithm
   */
  async getCodeGenerations(algorithmId: number, userId: number): Promise<any[]> {
    const pool = getPool();

    const [generations] = await pool.query(
      `SELECT cg.*, 
       COUNT(ce.id) as execution_count,
       MAX(ce.created_at) as last_executed_at
       FROM code_generations cg
       LEFT JOIN code_executions ce ON cg.id = ce.code_generation_id
       WHERE cg.algorithm_id = ? AND cg.user_id = ?
       GROUP BY cg.id
       ORDER BY cg.created_at DESC`,
      [algorithmId, userId]
    ) as any[];

    return generations;
  },

  /**
   * Get specific code generation
   */
  async getCodeGeneration(generationId: number, userId: number): Promise<any> {
    const pool = getPool();

    const [generations] = await pool.query(
      `SELECT * FROM code_generations 
       WHERE id = ? AND user_id = ?`,
      [generationId, userId]
    ) as any[];

    if (generations.length === 0) {
      throw new Error('Code generation not found');
    }

    return generations[0];
  },

  /**
   * Update code generation
   */
  async updateCodeGeneration(
    generationId: number,
    userId: number,
    updates: { code?: string; version?: string }
  ): Promise<void> {
    const pool = getPool();

    const updatesList: string[] = [];
    const values: any[] = [];

    if (updates.code) {
      updatesList.push('code = ?');
      values.push(updates.code);
    }

    if (updates.version) {
      updatesList.push('version = ?');
      values.push(updates.version);
    }

    if (updatesList.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(generationId, userId);

    await pool.query(
      `UPDATE code_generations 
       SET ${updatesList.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      values
    );
  },

  /**
   * Delete code generation
   */
  async deleteCodeGeneration(generationId: number, userId: number): Promise<void> {
    const pool = getPool();

    await pool.query(
      `DELETE FROM code_generations 
       WHERE id = ? AND user_id = ?`,
      [generationId, userId]
    );
  },

  /**
   * Build code generation prompt
   */
  _buildCodeGenerationPrompt(algorithm: any, steps: string[], language: SupportedLanguage): string {
    const languageInfo = {
      python: 'Python 3.10+',
      javascript: 'JavaScript (ES6+)',
      java: 'Java 17+',
      cpp: 'C++17',
      typescript: 'TypeScript 5+',
      go: 'Go 1.21+',
      rust: 'Rust 1.70+'
    };

    return `You are an expert ${languageInfo[language]} developer. Generate a complete, production-ready implementation of the following bio-inspired algorithm.

Algorithm Name: ${algorithm.name}
Domain: ${algorithm.domain}
Inspiration: ${algorithm.inspiration}
Core Principle: ${algorithm.principle}
Description: ${algorithm.description}

Algorithm Steps:
${steps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}

Pseudocode:
${algorithm.pseudo_code}

Requirements:
1. Generate complete, runnable ${language} code
2. Include proper error handling
3. Add clear comments explaining key parts
4. Follow ${language} best practices and conventions
5. Include type hints/annotations where applicable
6. Make the code modular and well-structured
7. Include example usage if helpful

Return the code as a complete, executable implementation.`;
  }
};

