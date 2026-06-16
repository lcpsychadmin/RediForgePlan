// server/src/routes/programs.routes.ts
// Program API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import programService from '../services/programService.js';
import projectService from '../services/projectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// List all programs
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const programs = await programService.getAllPrograms();
    res.json(formatListResponse(programs, programs.length));
  } catch (error) {
    next(error);
  }
});

// Create program (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        throw new ApiError(400, 'Program name is required', 'MISSING_FIELD');
      }

      const program = await programService.createProgram(name, description);
      res.status(201).json(formatSingleResponse(program));
    } catch (error) {
      next(error);
    }
  }
);

// Get program by ID
router.get('/:programId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const program = await programService.getProgramById(req.params.programId);

    if (!program) {
      throw new ApiError(404, 'Program not found', 'NOT_FOUND');
    }

    const stats = await programService.getProgramStats(req.params.programId);
    const response = { ...program, stats };

    res.json(formatSingleResponse(response));
  } catch (error) {
    next(error);
  }
});

// Update program (admin only)
router.patch(
  '/:programId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await programService.updateProgram(req.params.programId, req.body);

      if (!program) {
        throw new ApiError(404, 'Program not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(program));
    } catch (error) {
      next(error);
    }
  }
);

// Delete program (admin only)
router.delete(
  '/:programId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await programService.deleteProgram(req.params.programId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get mock cycles for program
router.get(
  '/:programId/mock-cycles',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await programService.getProgramById(req.params.programId);
      if (!program) {
        throw new ApiError(404, 'Program not found', 'NOT_FOUND');
      }

      const cycles = await programService.getMockCyclesByProgram(req.params.programId);
      res.json(formatListResponse(cycles, cycles.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create mock cycle (admin only)
router.post(
  '/:programId/mock-cycles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await programService.getProgramById(req.params.programId);
      if (!program) {
        throw new ApiError(404, 'Program not found', 'NOT_FOUND');
      }

      const { name, startDate, endDate } = req.body;

      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Mock cycle name, startDate, and endDate are required', 'MISSING_FIELD');
      }

      const cycle = await programService.createMockCycle(
        req.params.programId,
        name,
        startDate,
        endDate
      );

      res.status(201).json(formatSingleResponse(cycle));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
