// server/src/routes/globalObjects.routes.ts
// Global object API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import globalObjectService from '../services/globalObjectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// List all global objects with filters
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      processArea: req.query.processArea as string | undefined,
      search: req.query.search as string | undefined,
    };

    const objects = await globalObjectService.getAllGlobalObjects(filters);
    res.json(formatListResponse(objects, objects.length));
  } catch (error) {
    next(error);
  }
});

// Create global object (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objectId, description, processArea } = req.body;

      if (!objectId) {
        throw new ApiError(400, 'Object ID is required', 'MISSING_FIELD');
      }

      const object = await globalObjectService.createGlobalObject(
        objectId,
        description,
        processArea
      );

      res.status(201).json(formatSingleResponse(object));
    } catch (error) {
      next(error);
    }
  }
);

// Get global object by ID
router.get(
  '/:globalObjectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const object = await globalObjectService.getGlobalObjectById(req.params.globalObjectId);

      if (!object) {
        throw new ApiError(404, 'Global object not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(object));
    } catch (error) {
      next(error);
    }
  }
);

// Update global object (admin only)
router.patch(
  '/:globalObjectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const object = await globalObjectService.updateGlobalObject(req.params.globalObjectId, req.body);

      if (!object) {
        throw new ApiError(404, 'Global object not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(object));
    } catch (error) {
      next(error);
    }
  }
);

// Delete global object (admin only)
router.delete(
  '/:globalObjectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await globalObjectService.deleteGlobalObject(req.params.globalObjectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
