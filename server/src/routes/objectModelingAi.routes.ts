import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  analyzeSubObjects,
  deriveSubObjectCdm,
  suggestMappings,
} from '../controllers/objectModelingAi.controller.js';

const router = Router();

router.post('/objects/:objectId/analyze-subobjects', requireAuth, requireRole('admin'), analyzeSubObjects);
router.post('/subobjects/:subObjectId/derive-cdm', requireAuth, requireRole('admin'), deriveSubObjectCdm);
router.post('/mappings/suggest', requireAuth, requireRole('analyst', 'admin'), suggestMappings);

export default router;
