import { getPool } from '../db/connection.js';

// Version control service
export const versionControlService = {
  /**
   * Create a new branch
   */
  async createBranch(
    algorithmId: number,
    userId: number,
    branchName: string,
    options?: { parentBranchId?: number; parentVersionId?: number; description?: string }
  ): Promise<{ id: number; branchName: string }> {
    const pool = getPool();

    // Verify algorithm ownership
    const [algorithms] = await pool.query(
      `SELECT id FROM algorithms WHERE id = ? AND user_id = ?`,
      [algorithmId, userId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    // Create branch
    const [result] = await pool.query(
      `INSERT INTO algorithm_branches
       (algorithm_id, user_id, branch_name, parent_branch_id, parent_version_id, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        algorithmId,
        userId,
        branchName,
        options?.parentBranchId || null,
        options?.parentVersionId || null,
        options?.description || null
      ]
    ) as any[];

    // Create initial version from current algorithm state
    await this._createBranchVersion(result.insertId, algorithmId);

    return {
      id: result.insertId,
      branchName
    };
  },

  /**
   * Get branches for algorithm
   */
  async getBranches(algorithmId: number, userId: number): Promise<any[]> {
    const pool = getPool();

    const [branches] = await pool.query(
      `SELECT b.*,
       (SELECT COUNT(*) FROM branch_versions bv WHERE bv.branch_id = b.id) as version_count,
       (SELECT MAX(version_number) FROM branch_versions bv WHERE bv.branch_id = b.id) as latest_version
       FROM algorithm_branches b
       WHERE b.algorithm_id = ? AND b.user_id = ?
       ORDER BY b.created_at DESC`,
      [algorithmId, userId]
    ) as any[];

    return branches;
  },

  /**
   * Get branch with versions
   */
  async getBranch(branchId: number, userId: number): Promise<any> {
    const pool = getPool();

    const [branches] = await pool.query(
      `SELECT * FROM algorithm_branches
       WHERE id = ? AND user_id = ?`,
      [branchId, userId]
    ) as any[];

    if (branches.length === 0) {
      throw new Error('Branch not found');
    }

    const branch = branches[0];

    // Get versions
    const [versions] = await pool.query(
      `SELECT * FROM branch_versions
       WHERE branch_id = ?
       ORDER BY version_number DESC`,
      [branchId]
    ) as any[];

    return {
      ...branch,
      versions: versions.map((v: any) => ({
        ...v,
        steps: typeof v.steps === 'string' ? JSON.parse(v.steps) : v.steps
      }))
    };
  },

  /**
   * Create version in branch
   */
  async createVersion(
    branchId: number,
    userId: number,
    algorithmData: { name?: string; description?: string; steps?: any; pseudoCode?: string; changeNote?: string }
  ): Promise<{ id: number; versionNumber: number }> {
    const pool = getPool();

    // Verify branch ownership
    const [branches] = await pool.query(
      `SELECT * FROM algorithm_branches WHERE id = ? AND user_id = ?`,
      [branchId, userId]
    ) as any[];

    if (branches.length === 0) {
      throw new Error('Branch not found');
    }

    // Get next version number
    const [versions] = await pool.query(
      `SELECT MAX(version_number) as max_version FROM branch_versions WHERE branch_id = ?`,
      [branchId]
    ) as any[];

    const nextVersion = (versions[0]?.max_version || 0) + 1;

    // Get current algorithm state if not provided
    let steps = algorithmData.steps;
    let pseudoCode = algorithmData.pseudoCode;
    let name = algorithmData.name;
    let description = algorithmData.description;

    if (!steps || !pseudoCode) {
      const [algorithms] = await pool.query(
        `SELECT name, description, steps, pseudo_code FROM algorithms WHERE id = ?`,
        [branches[0].algorithm_id]
      ) as any[];

      if (algorithms.length > 0) {
        const algo = algorithms[0];
        name = name || algo.name;
        description = description || algo.description;
        steps = steps || (typeof algo.steps === 'string' ? JSON.parse(algo.steps) : algo.steps);
        pseudoCode = pseudoCode || algo.pseudo_code;
      }
    }

    // Create version
    const [result] = await pool.query(
      `INSERT INTO branch_versions
       (branch_id, version_number, name, description, steps, pseudo_code, change_note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        branchId,
        nextVersion,
        name || 'Untitled',
        description || '',
        JSON.stringify(steps),
        pseudoCode || '',
        algorithmData.changeNote || null
      ]
    ) as any[];

    return {
      id: result.insertId,
      versionNumber: nextVersion
    };
  },

  /**
   * Merge branch
   */
  async mergeBranch(
    sourceBranchId: number,
    targetBranchId: number,
    userId: number,
    options?: { strategy?: 'fast-forward' | 'merge' | 'squash' }
  ): Promise<void> {
    const pool = getPool();

    // Verify both branches belong to user
    const [branches] = await pool.query(
      `SELECT * FROM algorithm_branches
       WHERE id IN (?, ?) AND user_id = ?`,
      [sourceBranchId, targetBranchId, userId]
    ) as any[];

    if (branches.length !== 2) {
      throw new Error('One or both branches not found');
    }

    const sourceBranch = branches.find((b: any) => b.id === sourceBranchId);
    const targetBranch = branches.find((b: any) => b.id === targetBranchId);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Branches not found');
    }

    if (sourceBranch.algorithm_id !== targetBranch.algorithm_id) {
      throw new Error('Cannot merge branches from different algorithms');
    }

    // Get latest version from source branch
    const [sourceVersions] = await pool.query(
      `SELECT * FROM branch_versions
       WHERE branch_id = ?
       ORDER BY version_number DESC
       LIMIT 1`,
      [sourceBranchId]
    ) as any[];

    if (sourceVersions.length === 0) {
      throw new Error('Source branch has no versions');
    }

    const sourceVersion = sourceVersions[0];

    // Create merge version in target branch
    await this.createVersion(targetBranchId, userId, {
      name: sourceVersion.name,
      description: sourceVersion.description,
      steps: typeof sourceVersion.steps === 'string' ? JSON.parse(sourceVersion.steps) : sourceVersion.steps,
      pseudoCode: sourceVersion.pseudo_code,
      changeNote: `Merged from branch: ${sourceBranch.branch_name}`
    });

    // Mark source branch as merged
    await pool.query(
      `UPDATE algorithm_branches
       SET is_merged = TRUE, merged_into_branch_id = ?
       WHERE id = ?`,
      [targetBranchId, sourceBranchId]
    );
  },

  /**
   * Compare versions
   */
  async compareVersions(
    versionId1: number,
    versionId2: number,
    userId: number
  ): Promise<{
    differences: Array<{ field: string; oldValue: any; newValue: any }>;
    similarity: number;
  }> {
    const pool = getPool();

    // Get versions
    const [versions] = await pool.query(
      `SELECT bv.*, b.user_id
       FROM branch_versions bv
       JOIN algorithm_branches b ON bv.branch_id = b.id
       WHERE bv.id IN (?, ?) AND b.user_id = ?`,
      [versionId1, versionId2, userId]
    ) as any[];

    if (versions.length !== 2) {
      throw new Error('One or both versions not found');
    }

    const v1 = versions.find((v: any) => v.id === versionId1);
    const v2 = versions.find((v: any) => v.id === versionId2);

    if (!v1 || !v2) {
      throw new Error('Versions not found');
    }

    // Compare
    const differences: Array<{ field: string; oldValue: any; newValue: any }> = [];

    const steps1 = typeof v1.steps === 'string' ? JSON.parse(v1.steps) : v1.steps;
    const steps2 = typeof v2.steps === 'string' ? JSON.parse(v2.steps) : v2.steps;

    if (JSON.stringify(steps1) !== JSON.stringify(steps2)) {
      differences.push({
        field: 'steps',
        oldValue: steps1,
        newValue: steps2
      });
    }

    if (v1.pseudo_code !== v2.pseudo_code) {
      differences.push({
        field: 'pseudo_code',
        oldValue: v1.pseudo_code,
        newValue: v2.pseudo_code
      });
    }

    if (v1.description !== v2.description) {
      differences.push({
        field: 'description',
        oldValue: v1.description,
        newValue: v2.description
      });
    }

    // Calculate similarity
    const totalFields = 3;
    const changedFields = differences.length;
    const similarity = ((totalFields - changedFields) / totalFields) * 100;

    return {
      differences,
      similarity
    };
  },

  /**
   * Create initial branch version
   */
  async _createBranchVersion(branchId: number, algorithmId: number): Promise<void> {
    const pool = getPool();

    // Get algorithm current state
    const [algorithms] = await pool.query(
      `SELECT name, description, steps, pseudo_code FROM algorithms WHERE id = ?`,
      [algorithmId]
    ) as any[];

    if (algorithms.length === 0) return;

    const algo = algorithms[0];

    await pool.query(
      `INSERT INTO branch_versions
       (branch_id, version_number, name, description, steps, pseudo_code, change_note)
       VALUES (?, 1, ?, ?, ?, ?, 'Initial version')`,
      [
        branchId,
        algo.name,
        algo.description,
        algo.steps,
        algo.pseudo_code
      ]
    );
  }
};

