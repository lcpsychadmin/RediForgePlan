import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import validationController from './validation.controller.js';

const router = Router();

router.post(
  '/tasks/:taskId/validation-stats',
  requireAuth,
  requireRole('analyst', 'admin'),
  (req, res, next) => validationController.createOrUpdateStats(req, res, next)
);

router.get(
  '/tasks/:taskId/validation-stats',
  requireAuth,
  (req, res, next) => validationController.getStats(req, res, next)
);

export default router;
