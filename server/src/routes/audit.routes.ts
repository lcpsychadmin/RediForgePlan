// server/src/routes/audit.routes.ts
// Audit log API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { AuditService } from '../services/priorityService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();
const auditService = new AuditService();

// List audit logs (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const logs = await auditService.getAuditLogs(filters);
    res.json(formatListResponse(logs, logs.length, filters.limit, filters.offset));
  } catch (error) {
    next(error);
  }
});

// Get audit log by ID (admin only)
router.get(
  '/:auditLogId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await auditService.getAuditLogById(req.params.auditLogId);

      if (!log) {
        throw new ApiError(404, 'Audit log not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(log));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
