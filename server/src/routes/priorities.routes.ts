// server/src/routes/priorities.routes.ts
// Priorities and views API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import viewService from '../services/viewService.js';
import projectService from '../services/projectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// Get prioritized tasks for project
router.get(
  '/project/:projectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const prioritized = await viewService.priority.getPrioritizedTasks(req.params.projectId);

      res.json(formatSingleResponse(prioritized));
    } catch (error) {
      next(error);
    }
  }
);

// Get project status overview
router.get(
  '/status/:projectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await viewService.projectStatus.getProjectStatus(req.params.projectId);

      if (!status) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(status));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
