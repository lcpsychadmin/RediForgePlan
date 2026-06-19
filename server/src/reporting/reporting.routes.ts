import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import reportingController from './reporting.controller.js';

const router = Router();

router.get('/projects/:projectId/summary', requireAuth, (req, res, next) =>
  reportingController.getProjectSummary(req, res, next)
);

router.get('/mock-cycles/:mockCycleId/summary', requireAuth, (req, res, next) =>
  reportingController.getMockCycleSummary(req, res, next)
);

router.get('/programs/:programId/summary', requireAuth, (req, res, next) =>
  reportingController.getProgramSummary(req, res, next)
);

router.get('/projects/:projectId/trends', requireAuth, (req, res, next) =>
  reportingController.getTrends(req, res, next)
);

router.get('/projects/:projectId/issues', requireAuth, (req, res, next) =>
  reportingController.getIssueBreakdown(req, res, next)
);

export default router;
