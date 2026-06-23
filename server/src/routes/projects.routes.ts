// server/src/routes/projects.routes.ts
// Project API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import programService from '../services/programService.js';
import projectService from '../services/projectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// Get projects by mock cycle
router.get(
  '/by-cycle/:mockCycleId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      const projects = await projectService.getProjectsByMockCycle(req.params.mockCycleId);
      res.json(formatListResponse(projects, projects.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create project (admin only)
router.post(
  '/by-cycle/:mockCycleId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      const { name, description, startDate, endDate } = req.body;

      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Project name, startDate, and endDate are required', 'MISSING_FIELD');
      }

      const existingProjects = await projectService.getProjectsByMockCycle(req.params.mockCycleId);
      if (existingProjects.length > 0) {
        throw new ApiError(409, 'This mock cycle already has a project assigned', 'CONFLICT');
      }

      const project = await projectService.createProject(
        req.params.mockCycleId,
        name,
        description,
        startDate,
        endDate
      );

      res.status(201).json(formatSingleResponse(project));
    } catch (error) {
      next(error);
    }
  }
);

// Get project by ID
router.get('/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);

    if (!project) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const stats = await projectService.getProjectStats(req.params.projectId);
    const response = { ...project, stats };

    res.json(formatSingleResponse(response));
  } catch (error) {
    next(error);
  }
});

// Update project (admin only)
router.patch(
  '/:projectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.updateProject(req.params.projectId, req.body);

      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(project));
    } catch (error) {
      next(error);
    }
  }
);

// Delete project (admin only)
router.delete(
  '/:projectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await projectService.deleteProject(req.params.projectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
