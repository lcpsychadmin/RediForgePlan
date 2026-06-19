import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import defectsController from './defects.controller.js';

const router = Router();

router.post(
  '/tasks/:taskId/defects',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => defectsController.createDefect(req, res, next)
);

router.get(
  '/tasks/:taskId/defects',
  requireAuth,
  (req, res, next) => defectsController.getDefectsForTask(req, res, next)
);

router.get(
  '/defects/:defectId',
  requireAuth,
  (req, res, next) => defectsController.getDefect(req, res, next)
);

router.patch(
  '/defects/:defectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => defectsController.updateDefect(req, res, next)
);

router.delete(
  '/defects/:defectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => defectsController.deleteDefect(req, res, next)
);

export default router;
