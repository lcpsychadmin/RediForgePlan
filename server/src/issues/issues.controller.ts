import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import taskService from '../services/taskService.js';
import issuesService from './issues.service.js';

const toNonNegativeInt = (value: any, fieldName: string) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative integer`, 'VALIDATION_ERROR');
  }
  return num;
};

class IssuesController {
  async createIssueType(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const issueCode = (req.body.issueCode || '').trim();
      const issueDescription = req.body.issueDescription;
      const count = toNonNegativeInt(req.body.count, 'count');

      if (!issueCode) {
        throw new ApiError(400, 'issueCode is required', 'MISSING_FIELD');
      }

      const issueType = await issuesService.createIssueType(taskId, {
        issueCode,
        issueDescription,
        count,
      });

      res.status(201).json(formatSingleResponse(issueType));
    } catch (error) {
      next(error);
    }
  }

  async getIssueTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const issueTypes = await issuesService.getIssueTypes(taskId);
      res.json(formatListResponse(issueTypes, issueTypes.length));
    } catch (error) {
      next(error);
    }
  }

  async createIssueRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { issueTypeId } = req.params;
      const issueType = await issuesService.getIssueTypeById(issueTypeId);
      if (!issueType) throw new ApiError(404, 'Issue type not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(issueType.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const recordIdentifier = (req.body.recordIdentifier || '').trim();
      if (!recordIdentifier) {
        throw new ApiError(400, 'recordIdentifier is required', 'MISSING_FIELD');
      }

      const record = await issuesService.createIssueRecord(issueTypeId, {
        recordIdentifier,
        rawData: req.body.rawData,
      });

      res.status(201).json(formatSingleResponse(record));
    } catch (error) {
      next(error);
    }
  }

  async getIssueRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { issueTypeId } = req.params;
      const issueType = await issuesService.getIssueTypeById(issueTypeId);
      if (!issueType) throw new ApiError(404, 'Issue type not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(issueType.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const records = await issuesService.getIssueRecords(issueTypeId);
      res.json(formatListResponse(records, records.length));
    } catch (error) {
      next(error);
    }
  }
}

export default new IssuesController();
