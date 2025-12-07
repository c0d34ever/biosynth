import { getPool } from '../db/connection.js';
import { getAIClient, generateContentWithErrorHandling, DEFAULT_MODEL } from './geminiService.js';
import { codeExecutionService } from './codeExecution.js';

// Testing service
export const testingService = {
  /**
   * Auto-generate tests for algorithm
   */
  async generateTests(
    algorithmId: number,
    userId: number,
    testType: 'unit' | 'integration' | 'performance' | 'regression' = 'unit'
  ): Promise<{ id: number; testName: string; testCode: string }[]> {
    const pool = getPool();

    // Get algorithm details
    const [algorithms] = await pool.query(
      `SELECT name, description, principle, steps, pseudo_code, domain, applications
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
    const applications = typeof algorithm.applications === 'string'
      ? JSON.parse(algorithm.applications)
      : algorithm.applications;

    // Generate tests using AI
    const prompt = this._buildTestGenerationPrompt(algorithm, steps, applications, testType);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          tests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                testName: { type: "string" },
                testCode: { type: "string" },
                expectedResult: { type: "object" },
                testData: { type: "object" }
              },
              required: ["testName", "testCode"]
            }
          }
        },
        required: ["tests"]
      }
    });

    // Save generated tests
    const savedTests = [];
    for (const test of response.tests) {
      const [result] = await pool.query(
        `INSERT INTO algorithm_tests
         (algorithm_id, user_id, test_name, test_type, test_code, expected_result, test_data, is_auto_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          algorithmId,
          userId,
          test.testName,
          testType,
          test.testCode,
          JSON.stringify(test.expectedResult || {}),
          JSON.stringify(test.testData || {})
        ]
      ) as any[];

      savedTests.push({
        id: result.insertId,
        testName: test.testName,
        testCode: test.testCode
      });
    }

    return savedTests;
  },

  /**
   * Run tests
   */
  async runTests(
    testIds: number[],
    codeGenerationId: number | null,
    userId: number
  ): Promise<any[]> {
    const pool = getPool();
    const results = [];

    for (const testId of testIds) {
      // Get test
      const [tests] = await pool.query(
        `SELECT * FROM algorithm_tests WHERE id = ? AND user_id = ?`,
        [testId, userId]
      ) as any[];

      if (tests.length === 0) continue;

      const test = tests[0];
      let testResult: any;

      if (codeGenerationId) {
        // Execute test against code
        testResult = await this._executeTest(test, codeGenerationId, userId);
      } else {
        // Just validate test structure
        testResult = {
          status: 'skipped',
          error_message: 'No code generation specified'
        };
      }

      // Save test result
      const [result] = await pool.query(
        `INSERT INTO test_results
         (test_id, code_generation_id, status, execution_time_ms, actual_result, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          testId,
          codeGenerationId,
          testResult.status,
          testResult.executionTime || null,
          testResult.actualResult ? JSON.stringify(testResult.actualResult) : null,
          testResult.error || null
        ]
      ) as any[];

      results.push({
        testId,
        resultId: result.insertId,
        ...testResult
      });
    }

    return results;
  },

  /**
   * Get tests for algorithm
   */
  async getTests(algorithmId: number, userId: number): Promise<any[]> {
    const pool = getPool();

    const [tests] = await pool.query(
      `SELECT t.*, 
       (SELECT COUNT(*) FROM test_results tr WHERE tr.test_id = t.id AND tr.status = 'passed') as passed_count,
       (SELECT COUNT(*) FROM test_results tr WHERE tr.test_id = t.id AND tr.status = 'failed') as failed_count,
       (SELECT MAX(created_at) FROM test_results tr WHERE tr.test_id = t.id) as last_run_at
       FROM algorithm_tests t
       WHERE t.algorithm_id = ? AND t.user_id = ?
       ORDER BY t.created_at DESC`,
      [algorithmId, userId]
    ) as any[];

    return tests.map((test: any) => ({
      ...test,
      expected_result: test.expected_result ? JSON.parse(test.expected_result) : null,
      test_data: test.test_data ? JSON.parse(test.test_data) : null
    }));
  },

  /**
   * Get test results
   */
  async getTestResults(testId: number, userId: number, limit: number = 50): Promise<any[]> {
    const pool = getPool();

    const [results] = await pool.query(
      `SELECT tr.*, t.test_name, t.test_type
       FROM test_results tr
       JOIN algorithm_tests t ON tr.test_id = t.id
       WHERE tr.test_id = ? AND t.user_id = ?
       ORDER BY tr.created_at DESC
       LIMIT ?`,
      [testId, userId, limit]
    ) as any[];

    return results.map((result: any) => ({
      ...result,
      actual_result: result.actual_result ? JSON.parse(result.actual_result) : null
    }));
  },

  /**
   * Execute test
   */
  async _executeTest(test: any, codeGenerationId: number, userId: number): Promise<any> {
    const pool = getPool();
    try {
      // Get code generation
      const [generations] = await pool.query(
        `SELECT * FROM code_generations WHERE id = ? AND user_id = ?`,
        [codeGenerationId, userId]
      ) as any[];

      if (generations.length === 0) {
        return {
          status: 'error',
          error: 'Code generation not found'
        };
      }

      const generation = generations[0];
      const testData = test.test_data ? JSON.parse(test.test_data) : {};

      // Combine test code with algorithm code
      const combinedCode = `${generation.code}\n\n${test.test_code}`;

      // Execute combined code
      const startTime = Date.now();
      const execution = await codeExecutionService.executeCode(
        codeGenerationId,
        userId,
        testData,
        { language: generation.language }
      );

      const executionTime = Date.now() - startTime;

      // Parse result
      const expectedResult = test.expected_result ? JSON.parse(test.expected_result) : null;
      const actualResult = execution.output ? JSON.parse(execution.output) : null;

      // Compare results
      const passed = this._compareResults(expectedResult, actualResult);

      return {
        status: passed ? 'passed' : 'failed',
        executionTime,
        actualResult,
        error: execution.error || null
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message
      };
    }
  },

  /**
   * Compare expected vs actual results
   */
  _compareResults(expected: any, actual: any): boolean {
    if (expected === null || expected === undefined) {
      return actual !== null && actual !== undefined;
    }

    if (typeof expected !== typeof actual) {
      return false;
    }

    if (typeof expected === 'object') {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual || {});

      if (expectedKeys.length !== actualKeys.length) {
        return false;
      }

      for (const key of expectedKeys) {
        if (!this._compareResults(expected[key], actual[key])) {
          return false;
        }
      }

      return true;
    }

    return expected === actual;
  },

  /**
   * Build test generation prompt
   */
  _buildTestGenerationPrompt(
    algorithm: any,
    steps: string[],
    applications: string[],
    testType: string
  ): string {
    return `You are an expert software tester. Generate comprehensive ${testType} tests for the following bio-inspired algorithm.

Algorithm Name: ${algorithm.name}
Domain: ${algorithm.domain}
Description: ${algorithm.description}
Core Principle: ${algorithm.principle}

Algorithm Steps:
${steps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}

Applications:
${applications.join(', ')}

Requirements:
1. Generate multiple ${testType} test cases
2. Include edge cases and boundary conditions
3. Test both valid and invalid inputs
4. Include performance tests if applicable
5. Make tests clear and well-documented
6. Include expected results for each test
7. Use appropriate testing framework for the language

Generate tests that thoroughly validate the algorithm's correctness and performance.`;
  }
};

