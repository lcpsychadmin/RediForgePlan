import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import taskService from '../services/taskService.js';
import validationService from './validation.service.js';

const toNonNegativeInt = (value: any, fieldName: string) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative integer`, 'VALIDATION_ERROR');
  }
  return num;
};

class ValidationController {
  async createOrUpdateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const totalRecords = toNonNegativeInt(req.body.totalRecords, 'totalRecords');
      const validRecords = toNonNegativeInt(req.body.validRecords, 'validRecords');
      const invalidRecords = toNonNegativeInt(req.body.invalidRecords, 'invalidRecords');

      const stats = await validationService.createOrUpdateStats(taskId, {
        totalRecords,
        validRecords,
        invalidRecords,
      });

      res.json(formatSingleResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const stats = await validationService.getStats(taskId);
      res.json(formatSingleResponse(stats));
    } catch (error) {
      next(error);
    }
  }
}

export default new ValidationController();
