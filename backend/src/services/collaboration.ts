import { getPool } from '../db/connection.js';
import { randomBytes } from 'node:crypto';

// Collaboration service
export const collaborationService = {
  /**
   * Create collaboration session
   */
  async createSession(
    algorithmId: number,
    userId: number,
    options?: { expiresInHours?: number }
  ): Promise<{ id: number; sessionToken: string }> {
    const pool = getPool();

    // Verify algorithm ownership
    const [algorithms] = await pool.query(
      `SELECT id FROM algorithms WHERE id = ? AND user_id = ?`,
      [algorithmId, userId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
      : null;

    // Create session
    const [result] = await pool.query(
      `INSERT INTO collaboration_sessions
       (algorithm_id, created_by_user_id, session_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [algorithmId, userId, sessionToken, expiresAt]
    ) as any[];

    return {
      id: result.insertId,
      sessionToken
    };
  },

  /**
   * Join collaboration session
   */
  async joinSession(sessionToken: string, userId: number): Promise<{ sessionId: number; algorithmId: number }> {
    const pool = getPool();

    // Get session
    const [sessions] = await pool.query(
      `SELECT * FROM collaboration_sessions
       WHERE session_token = ? AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [sessionToken]
    ) as any[];

    if (sessions.length === 0) {
      throw new Error('Session not found or expired');
    }

    const session = sessions[0];

    // Add user to presence
    await pool.query(
      `INSERT INTO collaboration_presence (session_id, user_id, cursor_position)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP`,
      [session.id, userId, JSON.stringify({ line: 0, column: 0 })]
    );

    return {
      sessionId: session.id,
      algorithmId: session.algorithm_id
    };
  },

  /**
   * Update presence
   */
  async updatePresence(
    sessionId: number,
    userId: number,
    cursorPosition: { line: number; column: number }
  ): Promise<void> {
    const pool = getPool();

    await pool.query(
      `UPDATE collaboration_presence
       SET cursor_position = ?, last_activity = CURRENT_TIMESTAMP
       WHERE session_id = ? AND user_id = ?`,
      [JSON.stringify(cursorPosition), sessionId, userId]
    );
  },

  /**
   * Get active users in session
   */
  async getActiveUsers(sessionId: number): Promise<any[]> {
    const pool = getPool();

    // Get users active in last 30 seconds
    const [presence] = await pool.query(
      `SELECT p.*, u.name, u.email
       FROM collaboration_presence p
       JOIN users u ON p.user_id = u.id
       WHERE p.session_id = ?
       AND p.last_activity > DATE_SUB(NOW(), INTERVAL 30 SECOND)`,
      [sessionId]
    ) as any[];

    return presence.map((p: any) => ({
      userId: p.user_id,
      name: p.name,
      email: p.email,
      cursorPosition: p.cursor_position ? JSON.parse(p.cursor_position) : null,
      lastActivity: p.last_activity
    }));
  },

  /**
   * Leave session
   */
  async leaveSession(sessionId: number, userId: number): Promise<void> {
    const pool = getPool();

    await pool.query(
      `DELETE FROM collaboration_presence
       WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );
  },

  /**
   * End session
   */
  async endSession(sessionId: number, userId: number): Promise<void> {
    const pool = getPool();

    // Verify ownership
    const [sessions] = await pool.query(
      `SELECT * FROM collaboration_sessions
       WHERE id = ? AND created_by_user_id = ?`,
      [sessionId, userId]
    ) as any[];

    if (sessions.length === 0) {
      throw new Error('Session not found or unauthorized');
    }

    // Deactivate session
    await pool.query(
      `UPDATE collaboration_sessions
       SET is_active = FALSE
       WHERE id = ?`,
      [sessionId]
    );

    // Remove all presence
    await pool.query(
      `DELETE FROM collaboration_presence WHERE session_id = ?`,
      [sessionId]
    );
  },

  /**
   * Get session details
   */
  async getSession(sessionToken: string): Promise<any> {
    const pool = getPool();

    const [sessions] = await pool.query(
      `SELECT s.*, a.name as algorithm_name, u.name as creator_name
       FROM collaboration_sessions s
       JOIN algorithms a ON s.algorithm_id = a.id
       JOIN users u ON s.created_by_user_id = u.id
       WHERE s.session_token = ?`,
      [sessionToken]
    ) as any[];

    if (sessions.length === 0) {
      throw new Error('Session not found');
    }

    return sessions[0];
  }
};

