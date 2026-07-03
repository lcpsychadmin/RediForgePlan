import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import defectsController from './defects.controller.js';

const router = Router();

router.get(
  '/defects/root-cause-categories',
  requireAuth,
  (req, res, next) => defectsController.getRootCauseCategories(req, res, next)
);

router.post(
  '/defects/root-cause-categories',
  requireAuth,
  requireRole('admin'),
  (req, res, next) => defectsController.createRootCauseCategory(req, res, next)
);

router.patch(
  '/defects/root-cause-categories/:categoryId',
  requireAuth,
  requireRole('admin'),
  (req, res, next) => defectsController.updateRootCauseCategory(req, res, next)
);

router.delete(
  '/defects/root-cause-categories/:categoryId',
  requireAuth,
  requireRole('admin'),
  (req, res, next) => defectsController.deleteRootCauseCategory(req, res, next)
);

router.get(
  '/projects/:projectId/defects',
  requireAuth,
  (req, res, next) => defectsController.getDefectsForProject(req, res, next)
);

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

router.get(
  '/defects/:defectId/history',
  requireAuth,
  (req, res, next) => defectsController.getDefectHistory(req, res, next)
);

router.get(
  '/defects/:defectId/attachments',
  requireAuth,
  (req, res, next) => defectsController.getDefectAttachments(req, res, next)
);

router.post(
  '/defects/:defectId/attachments',
  requireAuth,
  (req, res, next) => defectsController.addDefectAttachment(req, res, next)
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

router.get(
  '/defects/:defectId/comments',
  requireAuth,
  (req, res, next) => defectsController.getDefectComments(req, res, next)
);

router.post(
  '/defects/:defectId/comments',
  requireAuth,
  (req, res, next) => defectsController.addDefectComment(req, res, next)
);

router.delete(
  '/defect-comments/:commentId',
  requireAuth,
  (req, res, next) => defectsController.deleteDefectComment(req, res, next)
);

router.get(
  '/defect-attachments/:attachmentId/download',
  requireAuth,
  (req, res, next) => defectsController.downloadDefectAttachment(req, res, next)
);

router.delete(
  '/defect-attachments/:attachmentId',
  requireAuth,
  (req, res, next) => defectsController.deleteDefectAttachment(req, res, next)
);

export default router;
