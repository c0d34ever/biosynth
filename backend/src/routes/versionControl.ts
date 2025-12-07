import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { versionControlService } from '../services/versionControl.js';
import { parseId } from '../utils/validation.js';

const router = Router();

const createBranchSchema = z.object({
  branchName: z.string().min(1),
  parentBranchId: z.number().optional(),
  parentVersionId: z.number().optional(),
  description: z.string().optional()
});

const createVersionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  steps: z.any().optional(),
  pseudoCode: z.string().optional(),
  changeNote: z.string().optional()
});

const mergeBranchSchema = z.object({
  targetBranchId: z.number(),
  strategy: z.enum(['fast-forward', 'merge', 'squash']).optional()
});

// Create branch
router.post('/branches/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const data = createBranchSchema.parse(req.body);

    const branch = await versionControlService.createBranch(
      algorithmId,
      req.userId,
      data.branchName,
      {
        parentBranchId: data.parentBranchId,
        parentVersionId: data.parentVersionId,
        description: data.description
      }
    );

    res.status(201).json(branch);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create branch' });
  }
});

// Get branches
router.get('/branches/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const branches = await versionControlService.getBranches(algorithmId, req.userId);
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get branches' });
  }
});

// Get branch with versions
router.get('/branches/:branchId/details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = parseId(req.params.branchId, 'branchId');
    const branch = await versionControlService.getBranch(branchId, req.userId);
    res.json(branch);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Branch not found' });
  }
});

// Create version
router.post('/branches/:branchId/versions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = parseId(req.params.branchId, 'branchId');
    const data = createVersionSchema.parse(req.body);

    const version = await versionControlService.createVersion(branchId, req.userId, data);
    res.status(201).json(version);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create version' });
  }
});

// Merge branch
router.post('/branches/:sourceBranchId/merge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sourceBranchId = parseId(req.params.sourceBranchId, 'sourceBranchId');
    const data = mergeBranchSchema.parse(req.body);

    await versionControlService.mergeBranch(
      sourceBranchId,
      data.targetBranchId,
      req.userId,
      { strategy: data.strategy }
    );

    res.json({ message: 'Branch merged successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to merge branch' });
  }
});

// Compare versions
router.get('/compare/:versionId1/:versionId2', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const versionId1 = parseId(req.params.versionId1, 'versionId1');
    const versionId2 = parseId(req.params.versionId2, 'versionId2');

    const comparison = await versionControlService.compareVersions(
      versionId1,
      versionId2,
      req.userId
    );

    res.json(comparison);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to compare versions' });
  }
});

export { router as versionControlRouter };

