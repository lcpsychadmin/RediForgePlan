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
      const { name, description, accentColor } = req.body;

      if (!name) {
        throw new ApiError(400, 'Program name is required', 'MISSING_FIELD');
      }

      const program = await programService.createProgram(name, description, accentColor);
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

      // Both views now show only active cycles (in_hierarchy = true)
      const cycles = await programService.getMockCyclesByProgram(req.params.programId);
      res.json(formatListResponse(cycles, cycles.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create mock cycle under an existing project (admin only)
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

      const { name, startDate, endDate, scheduleMode, accentColor, projectId } = req.body;

      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Mock cycle name, startDate, and endDate are required', 'MISSING_FIELD');
      }
      let targetProjectId: string | null = projectId || null;

      if (!targetProjectId) {
        const projects = await projectService.getProjectsByProgram(req.params.programId);
        targetProjectId = projects[0]?.id || null;
      }

      if (!targetProjectId) {
        throw new ApiError(400, 'No project exists in this program. Create a project first.', 'MISSING_FIELD');
      }

      const project = await projectService.getProjectById(targetProjectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }
      if (project.programId !== req.params.programId) {
        throw new ApiError(400, 'Project does not belong to this program', 'INVALID_FIELD');
      }

      const cycle = await programService.createMockCycle(
        targetProjectId,
        name,
        startDate,
        endDate,
        scheduleMode || 'all_days',
        accentColor
      );

      res.status(201).json(formatSingleResponse(cycle));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
