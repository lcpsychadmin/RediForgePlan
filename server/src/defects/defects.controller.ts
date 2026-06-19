import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import taskService from '../services/taskService.js';
import defectsService, { DefectSeverity, DefectStatus } from './defects.service.js';

const SEVERITIES: DefectSeverity[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

class DefectsController {
  async createDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const title = (req.body.title || '').trim();
      const severity = req.body.severity as DefectSeverity;

      if (!title) throw new ApiError(400, 'title is required', 'MISSING_FIELD');
      if (!SEVERITIES.includes(severity)) {
        throw new ApiError(400, 'severity must be one of low, medium, high, critical', 'VALIDATION_ERROR');
      }

      const defect = await defectsService.createDefect(taskId, {
        projectObjectId: req.body.projectObjectId,
        issueTypeId: req.body.issueTypeId,
        title,
        description: req.body.description,
        severity,
        assignedToUserId: req.body.assignedToUserId,
        createdByUserId: (req as any).userId,
      });

      res.status(201).json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async getDefectsForTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const defects = await defectsService.getDefectsForTask(taskId);
      res.json(formatListResponse(defects, defects.length));
    } catch (error) {
      next(error);
    }
  }

  async getDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(defect.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      res.json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async updateDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await defectsService.getDefect(req.params.defectId);
      if (!existing) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(existing.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const updates: any = {};

      if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.severity !== undefined) {
        if (!SEVERITIES.includes(req.body.severity)) {
          throw new ApiError(400, 'severity must be one of low, medium, high, critical', 'VALIDATION_ERROR');
        }
        updates.severity = req.body.severity;
      }
      if (req.body.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) {
          throw new ApiError(400, 'status must be one of open, in_progress, resolved, closed', 'VALIDATION_ERROR');
        }
        updates.status = req.body.status;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'assignedToUserId')) {
        updates.assignedToUserId = req.body.assignedToUserId || null;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'resolvedAt')) {
        updates.resolvedAt = req.body.resolvedAt || null;
      }

      const defect = await defectsService.updateDefect(req.params.defectId, updates);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      res.json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async deleteDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await defectsService.getDefect(req.params.defectId);
      if (!existing) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(existing.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      await defectsService.deleteDefect(req.params.defectId);
      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export default new DefectsController();
