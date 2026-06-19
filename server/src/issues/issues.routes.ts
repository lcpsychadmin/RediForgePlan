import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import issuesController from './issues.controller.js';

const router = Router();

router.post(
  '/tasks/:taskId/issue-types',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => issuesController.createIssueType(req, res, next)
);

router.get(
  '/tasks/:taskId/issue-types',
  requireAuth,
  (req, res, next) => issuesController.getIssueTypes(req, res, next)
);

router.post(
  '/issue-types/:issueTypeId/records',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => issuesController.createIssueRecord(req, res, next)
);

router.get(
  '/issue-types/:issueTypeId/records',
  requireAuth,
  (req, res, next) => issuesController.getIssueRecords(req, res, next)
);

export default router;
