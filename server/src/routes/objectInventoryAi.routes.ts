import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import objectInventoryAiService from '../services/objectInventoryAiService.js';
import {
  DeriveCdmFieldsRequest,
  ProposeSubObjectsRequest,
  SuggestMappingsRequest,
} from '../types/objectInventoryAi.js';

const router = Router();

router.post(
  '/propose-sub-objects',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as ProposeSubObjectsRequest;
      const result = await objectInventoryAiService.proposeSubObjects(payload);
      res.json(formatSingleResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/derive-cdm-fields',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as DeriveCdmFieldsRequest;
      const result = await objectInventoryAiService.deriveCdmFields(payload);
      res.json(formatSingleResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/suggest-field-mappings',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as SuggestMappingsRequest;
      const result = await objectInventoryAiService.suggestFieldMappings(payload);
      res.json(formatSingleResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
