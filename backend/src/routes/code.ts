import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { codeGenerationService } from '../services/codeGeneration.js';
import { codeExecutionService } from '../services/codeExecution.js';
import { codeAnalysisService } from '../services/codeAnalysis.js';
import { parseId } from '../utils/validation.js';

const router = Router();

const generateCodeSchema = z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'typescript', 'go', 'rust']),
  version: z.string().optional()
});

const executeCodeSchema = z.object({
  inputData: z.any().optional(),
  timeout: z.number().optional(),
  language: z.string().optional()
});

// Generate code
router.post('/generate/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const data = generateCodeSchema.parse(req.body);
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');

    const result = await codeGenerationService.generateCode(
      algorithmId,
      req.userId,
      data.language,
      { version: data.version }
    );

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to generate code' });
  }
});

// Get code generations
router.get('/generations/:algorithmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const algorithmId = parseId(req.params.algorithmId, 'algorithmId');
    const generations = await codeGenerationService.getCodeGenerations(algorithmId, req.userId);
    res.json(generations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get code generations' });
  }
});

// Get specific code generation
router.get('/generations/:generationId/details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const generation = await codeGenerationService.getCodeGeneration(generationId, req.userId);
    res.json(generation);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Code generation not found' });
  }
});

// Update code generation
router.put('/generations/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const updates = z.object({
      code: z.string().optional(),
      version: z.string().optional()
    }).parse(req.body);

    await codeGenerationService.updateCodeGeneration(generationId, req.userId, updates);
    res.json({ message: 'Code generation updated' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update code generation' });
  }
});

// Delete code generation
router.delete('/generations/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    await codeGenerationService.deleteCodeGeneration(generationId, req.userId);
    res.json({ message: 'Code generation deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete code generation' });
  }
});

// Execute code
router.post('/execute/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const data = executeCodeSchema.parse(req.body);

    const result = await codeExecutionService.executeCode(
      generationId,
      req.userId,
      data.inputData,
      { timeout: data.timeout, language: data.language }
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to execute code' });
  }
});

// Get execution history
router.get('/executions/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const limit = parseInt((req.query.limit as string) || '50', 10) || 50;
    const executions = await codeExecutionService.getExecutions(generationId, req.userId, limit);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get executions' });
  }
});

// Get execution details
router.get('/executions/:executionId/details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const executionId = parseId(req.params.executionId, 'executionId');
    const execution = await codeExecutionService.getExecution(executionId, req.userId);
    res.json(execution);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Execution not found' });
  }
});

// Analyze code for issues, gaps, problems
router.post('/analyze/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const { includeExecution = true, fixIssues = false } = req.body;

    const analysis = await codeAnalysisService.analyzeCode(
      generationId,
      req.userId,
      { includeExecution, fixIssues }
    );

    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to analyze code' });
  }
});

// Get analysis history
router.get('/analysis/:generationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const limit = parseInt((req.query.limit as string) || '10', 10) || 10;
    const analyses = await codeAnalysisService.getAnalysisHistory(generationId, req.userId, limit);
    res.json(analyses);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get analysis history' });
  }
});

// Get latest analysis
router.get('/analysis/:generationId/latest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const generationId = parseId(req.params.generationId, 'generationId');
    const analysis = await codeAnalysisService.getLatestAnalysis(generationId, req.userId);
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get latest analysis' });
  }
});

export { router as codeRouter };

