import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import projectService from '../services/projectService.js';
import programService from '../services/programService.js';
import reportingService from './reporting.service.js';

class ReportingController {
  async getProjectSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');

      const summary = await reportingService.getProjectSummary(req.params.projectId);
      res.json(formatSingleResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  async getMockCycleSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');

      const summary = await reportingService.getMockCycleSummary(req.params.mockCycleId);
      res.json(formatSingleResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  async getProgramSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const program = await programService.getProgramById(req.params.programId);
      if (!program) throw new ApiError(404, 'Program not found', 'NOT_FOUND');

      const summary = await reportingService.getProgramSummary(req.params.programId);
      res.json(formatSingleResponse(summary));
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');

      const trends = await reportingService.getTrends(req.params.projectId);
      res.json(formatSingleResponse(trends));
    } catch (error) {
      next(error);
    }
  }

  async getIssueBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');

      const issues = await reportingService.getIssueBreakdown(req.params.projectId);
      res.json(formatListResponse(issues, issues.length));
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportingController();
