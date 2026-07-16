// server/src/routes/globalObjects.routes.ts
// Global object API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import globalObjectService from '../services/globalObjectService.js';
import db from '../db.js';
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
      const { objectId, description, processArea, defaultGatewayId, defaultRouterId } = req.body;

      if (!objectId) {
        throw new ApiError(400, 'Object ID is required', 'MISSING_FIELD');
      }

      const object = await globalObjectService.createGlobalObject(
        objectId,
        description,
        processArea,
        defaultGatewayId,
        defaultRouterId
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

// Update global object (analyst or admin)
router.patch(
  '/:globalObjectId',
  requireAuth,
  requireRole('analyst', 'admin'),
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

router.get(
  '/:globalObjectId/sub-objects',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query(
        `SELECT id, global_object_id, name, description, sort_order, created_at, updated_at
         FROM object_sub_objects
         WHERE global_object_id = $1
         ORDER BY sort_order ASC, name ASC`,
        [req.params.globalObjectId]
      );
      res.json(formatListResponse(result.rows, result.rows.length));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:globalObjectId/sub-objects',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, sortOrder } = req.body || {};
      if (!String(name || '').trim()) {
        throw new ApiError(400, 'Sub-object name is required', 'MISSING_FIELD');
      }

      const result = await db.query(
        `INSERT INTO object_sub_objects (global_object_id, name, description, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, global_object_id, name, description, sort_order, created_at, updated_at`,
        [req.params.globalObjectId, String(name).trim(), description || null, Number(sortOrder || 0)]
      );

      res.status(201).json(formatSingleResponse(result.rows[0]));
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/sub-objects/:subObjectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, sortOrder } = req.body || {};
      if (!String(name || '').trim()) {
        throw new ApiError(400, 'Sub-object name is required', 'MISSING_FIELD');
      }

      const result = await db.query(
        `UPDATE object_sub_objects
         SET name = $1,
             description = $2,
             sort_order = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, global_object_id, name, description, sort_order, created_at, updated_at`,
        [String(name).trim(), description || null, Number(sortOrder || 0), req.params.subObjectId]
      );

      if (!result.rows.length) {
        throw new ApiError(404, 'Sub-object not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(result.rows[0]));
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/sub-objects/:subObjectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db.query('DELETE FROM object_sub_objects WHERE id = $1', [req.params.subObjectId]);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
