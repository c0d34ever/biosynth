import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { collaborationService } from '../services/collaboration.js';
import { parseId } from '../utils/validation.js';

const router = Router();

const createSessionSchema = z.object({
  expiresInHours: z.number().optional()
});

const updatePresenceSchema = z.object({
  cursorPosition: z.object({
    line: z.number(),
    column: z.number()
  })
});

// Create collaboration session
router.post('/sessions/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const data = createSessionSchema.parse(req.body);

    const session = await collaborationService.createSession(
      algorithmId,
      req.userId as number,
      { expiresInHours: data.expiresInHours }
    );

    res.status(201).json(session);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create session' });
  }
});

// Join session
router.post('/sessions/join/:sessionToken', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionToken } = req.params;
    const session = await collaborationService.joinSession(sessionToken, req.userId as number);
    res.json(session);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Session not found' });
  }
});

// Update presence
router.put('/presence/:sessionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    const data = updatePresenceSchema.parse(req.body);

    await collaborationService.updatePresence(sessionId, req.userId as number, data.cursorPosition);
    res.json({ message: 'Presence updated' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update presence' });
  }
});

// Get active users
router.get('/presence/:sessionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    const users = await collaborationService.getActiveUsers(sessionId);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get active users' });
  }
});

// Leave session
router.delete('/sessions/:sessionId/leave', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    await collaborationService.leaveSession(sessionId, req.userId as number);
    res.json({ message: 'Left session' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to leave session' });
  }
});

// End session
router.delete('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseId(req.params.sessionId, 'sessionId');
    await collaborationService.endSession(sessionId, req.userId as number);
    res.json({ message: 'Session ended' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to end session' });
  }
});

// Get session details
router.get('/sessions/:sessionToken', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionToken } = req.params;
    const session = await collaborationService.getSession(sessionToken);
    res.json(session);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Session not found' });
  }
});

export { router as collaborationRouter };

