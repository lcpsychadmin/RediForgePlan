// server/src/routes/schedule.routes.ts
// Schedule API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { ScheduleService } from '../services/priorityService.js';
import projectService from '../services/projectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();
const scheduleService = new ScheduleService();

// Get schedule by project
router.get(
  '/project/:projectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const items = await scheduleService.getScheduleByProject(req.params.projectId);
      res.json(formatListResponse(items, items.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create schedule item (analyst or admin)
router.post(
  '/project/:projectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const { taskId, scheduledDate } = req.body;

      if (!taskId || !scheduledDate) {
        throw new ApiError(400, 'Task ID and scheduled date are required', 'MISSING_FIELD');
      }

      const item = await scheduleService.createScheduleItem(
        req.params.projectId,
        taskId,
        scheduledDate
      );

      res.status(201).json(formatSingleResponse(item));
    } catch (error) {
      next(error);
    }
  }
);

// Update schedule item (analyst or admin)
router.patch(
  '/:scheduleItemId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scheduledDate } = req.body;

      if (!scheduledDate) {
        throw new ApiError(400, 'Scheduled date is required', 'MISSING_FIELD');
      }

      const item = await scheduleService.updateScheduleItem(req.params.scheduleItemId, scheduledDate);

      if (!item) {
        throw new ApiError(404, 'Schedule item not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(item));
    } catch (error) {
      next(error);
    }
  }
);

// Delete schedule item (analyst or admin)
router.delete(
  '/:scheduleItemId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await scheduleService.deleteScheduleItem(req.params.scheduleItemId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
