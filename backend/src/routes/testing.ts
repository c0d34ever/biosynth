import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { testingService } from '../services/testing.js';
import { parseId } from '../utils/validation.js';

const router = Router();

const generateTestsSchema = z.object({
  testType: z.enum(['unit', 'integration', 'performance', 'regression']).optional()
});

const runTestsSchema = z.object({
  testIds: z.array(z.number()),
  codeGenerationId: z.number().nullable().optional()
});

// Generate tests
router.post('/generate/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const data = generateTestsSchema.parse(req.body);

    const tests = await testingService.generateTests(
      algorithmId,
      req.userId as number,
      data.testType || 'unit'
    );

    res.status(201).json(tests);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to generate tests' });
  }
});

// Get tests
router.get('/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const tests = await testingService.getTests(algorithmId, req.userId as number);
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get tests' });
  }
});

// Run tests
router.post('/run', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = runTestsSchema.parse(req.body);
    const results = await testingService.runTests(
      data.testIds,
      data.codeGenerationId || null,
      req.userId as number
    );
    res.json(results);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to run tests' });
  }
});

// Get test results
router.get('/results/:testId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const testId = parseId(req.params.testId, 'testId');
    const limit = parseInt((req.query.limit as string) || '50', 10) || 50;
    const results = await testingService.getTestResults(testId, req.userId as number, limit);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get test results' });
  }
});

export { router as testingRouter };

