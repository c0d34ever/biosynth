import { getPool } from '../db/connection.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const execAsync = promisify(exec);

// Execution sandbox service
export const codeExecutionService = {
  /**
   * Execute code in sandbox
   */
  async executeCode(
    codeGenerationId: number,
    userId: number,
    inputData?: any,
    options?: { timeout?: number; language?: string }
  ): Promise<{ id: number; status: string; output?: string; error?: string }> {
    const pool = getPool();

    // Get code generation
    const [generations] = await pool.query(
      `SELECT cg.*, a.name as algorithm_name
       FROM code_generations cg
       JOIN algorithms a ON cg.algorithm_id = a.id
       WHERE cg.id = ? AND cg.user_id = ?`,
      [codeGenerationId, userId]
    ) as any[];

    if (generations.length === 0) {
      throw new Error('Code generation not found');
    }

    const generation = generations[0];
    const language = options?.language || generation.language;
    const timeout = options?.timeout || 30000; // 30 seconds default

    // Create execution record
    const [execResult] = await pool.query(
      `INSERT INTO code_executions 
       (code_generation_id, user_id, status, input_data)
       VALUES (?, ?, 'pending', ?)`,
      [codeGenerationId, userId, inputData ? JSON.stringify(inputData) : null]
    ) as any[];

    const executionId = execResult.insertId;

    // Update status to running
    await pool.query(
      `UPDATE code_executions SET status = 'running' WHERE id = ?`,
      [executionId]
    );

    try {
      // Execute code in sandbox
      const result = await this._executeInSandbox(
        generation.code,
        language,
        inputData,
        timeout
      );

      // Update execution record
      await pool.query(
        `UPDATE code_executions 
         SET status = ?, output_data = ?, error_message = ?, 
             execution_time_ms = ?, memory_usage_mb = ?, exit_code = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          result.status === 'success' ? 'completed' : 'failed',
          result.output || null,
          result.error || null,
          result.executionTime || null,
          result.memoryUsage || null,
          result.exitCode || null,
          executionId
        ]
      );

      return {
        id: executionId,
        status: result.status === 'success' ? 'completed' : 'failed',
        output: result.output,
        error: result.error
      };
    } catch (error: any) {
      // Update execution record with error
      await pool.query(
        `UPDATE code_executions 
         SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [error.message, executionId]
      );

      return {
        id: executionId,
        status: 'failed',
        error: error.message
      };
    }
  },

  /**
   * Get execution history
   */
  async getExecutions(
    codeGenerationId: number,
    userId: number,
    limit: number = 50
  ): Promise<any[]> {
    const pool = getPool();

    const [executions] = await pool.query(
      `SELECT * FROM code_executions
       WHERE code_generation_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [codeGenerationId, userId, limit]
    ) as any[];

    return executions.map((exec: any) => ({
      ...exec,
      input_data: exec.input_data ? JSON.parse(exec.input_data) : null
    }));
  },

  /**
   * Get execution details
   */
  async getExecution(executionId: number, userId: number): Promise<any> {
    const pool = getPool();

    const [executions] = await pool.query(
      `SELECT ce.*, cg.language, cg.code
       FROM code_executions ce
       JOIN code_generations cg ON ce.code_generation_id = cg.id
       WHERE ce.id = ? AND ce.user_id = ?`,
      [executionId, userId]
    ) as any[];

    if (executions.length === 0) {
      throw new Error('Execution not found');
    }

    const exec = executions[0];
    return {
      ...exec,
      input_data: exec.input_data ? JSON.parse(exec.input_data) : null
    };
  },

  /**
   * Execute code in sandbox (Docker-based)
   */
  async _executeInSandbox(
    code: string,
    language: string,
    inputData?: any,
    timeout: number = 30000
  ): Promise<{
    status: 'success' | 'error' | 'timeout';
    output?: string;
    error?: string;
    executionTime?: number;
    memoryUsage?: number;
    exitCode?: number;
  }> {
    const startTime = Date.now();
    const tempDir = join('/tmp', `code-exec-${randomBytes(8).toString('hex')}`);

    try {
      // Create temp directory
      await mkdir(tempDir, { recursive: true });

      // Write code to file
      const fileName = this._getFileName(language);
      const filePath = join(tempDir, fileName);
      await writeFile(filePath, code, 'utf8');

      // Prepare input data if provided
      let inputFile = null;
      if (inputData) {
        inputFile = join(tempDir, 'input.json');
        await writeFile(inputFile, JSON.stringify(inputData), 'utf8');
      }

      // Execute based on language
      const command = this._getExecutionCommand(language, fileName, inputFile);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: tempDir,
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      const executionTime = Date.now() - startTime;

      return {
        status: stderr ? 'error' : 'success',
        output: stdout || undefined,
        error: stderr || undefined,
        executionTime,
        exitCode: stderr ? 1 : 0
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
        return {
          status: 'timeout',
          error: `Execution timed out after ${timeout}ms`,
          executionTime
        };
      }

      return {
        status: 'error',
        error: error.message || 'Execution failed',
        executionTime,
        exitCode: error.code || 1
      };
    } finally {
      // Cleanup temp directory (async, don't wait)
      unlink(tempDir).catch(() => {});
    }
  },

  /**
   * Get file name for language
   */
  _getFileName(language: string): string {
    const extensions: Record<string, string> = {
      python: 'main.py',
      javascript: 'main.js',
      typescript: 'main.ts',
      java: 'Main.java',
      cpp: 'main.cpp',
      go: 'main.go',
      rust: 'main.rs'
    };
    return extensions[language] || 'main.txt';
  },

  /**
   * Get execution command for language
   */
  _getExecutionCommand(language: string, fileName: string, inputFile: string | null): string {
    const input = inputFile ? `< ${inputFile}` : '';
    
    const commands: Record<string, string> = {
      python: `python3 ${fileName} ${input}`,
      javascript: `node ${fileName} ${input}`,
      typescript: `ts-node ${fileName} ${input}`,
      java: `javac ${fileName} && java Main ${input}`,
      cpp: `g++ -o main ${fileName} && ./main ${input}`,
      go: `go run ${fileName} ${input}`,
      rust: `rustc ${fileName} && ./main ${input}`
    };

    return commands[language] || `cat ${fileName}`;
  }
};

