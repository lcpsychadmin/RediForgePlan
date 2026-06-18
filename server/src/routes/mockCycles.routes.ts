// server/src/routes/mockCycles.routes.ts
// Mock cycle API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import programService from '../services/programService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// Clone mock cycle with all nested project data (admin only)
router.post(
  '/:mockCycleId/clone',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clonedCycle = await programService.cloneMockCycle(req.params.mockCycleId, req.body || {});

      if (!clonedCycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      res.status(201).json(formatSingleResponse(clonedCycle));
    } catch (error) {
      next(error);
    }
  }
);

// Get mock cycle by ID
router.get('/:mockCycleId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycle = await programService.getMockCycleById(req.params.mockCycleId);

    if (!cycle) {
      throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
    }

    const stats = await programService.getMockCycleStats(req.params.mockCycleId);
    const response = { ...cycle, stats };

    res.json(formatSingleResponse(response));
  } catch (error) {
    next(error);
  }
});

// Update mock cycle (admin only)
router.patch(
  '/:mockCycleId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.updateMockCycle(req.params.mockCycleId, req.body);

      if (!cycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(cycle));
    } catch (error) {
      next(error);
    }
  }
);

// Delete mock cycle (admin only)
router.delete(
  '/:mockCycleId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await programService.deleteMockCycle(req.params.mockCycleId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
