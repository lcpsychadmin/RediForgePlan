// server/src/routes/projectObjects.routes.ts
// Project object (execution layer) API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import projectObjectService from '../services/projectObjectService.js';
import { DependencyService } from '../services/priorityService.js';
import projectService from '../services/projectService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();
const dependencyService = new DependencyService();

// Get project objects by project with filters
router.get(
  '/project/:projectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const filters = {
        status: req.query.status as string | undefined,
        draUserId: req.query.draUserId as string | undefined,
        developerUserId: req.query.developerUserId as string | undefined,
        processArea: req.query.processArea as string | undefined,
      };

      const objects = await projectObjectService.getProjectObjectsByProject(
        req.params.projectId,
        filters
      );

      res.json(formatListResponse(objects, objects.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create project object (analyst or admin)
router.post(
  '/project/:projectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const { globalObjectId, parentProjectObjectId, subObjectSuffix, subObjectDescription, ...data } = req.body;

      if (!globalObjectId && !parentProjectObjectId) {
        throw new ApiError(400, 'Either global object ID or parent project object ID is required', 'MISSING_FIELD');
      }

      let object;
      try {
        object = await projectObjectService.createProjectObject(req.params.projectId, {
          globalObjectId,
          parentProjectObjectId,
          subObjectSuffix,
          subObjectDescription,
          ...data,
        });
      } catch (error: any) {
        const message = error?.message || 'Unable to create project object';
        throw new ApiError(400, message, 'VALIDATION_ERROR');
      }

      res.status(201).json(formatSingleResponse(object));
    } catch (error) {
      next(error);
    }
  }
);

// Get project object by ID
router.get('/:projectObjectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const object = await projectObjectService.getProjectObjectById(req.params.projectObjectId);

    if (!object) {
      throw new ApiError(404, 'Project object not found', 'NOT_FOUND');
    }

    const stats = await projectObjectService.getProjectObjectStats(req.params.projectObjectId);
    const response = { ...object, stats };

    res.json(formatSingleResponse(response));
  } catch (error) {
    next(error);
  }
});

// Update project object (analyst or admin)
router.patch(
  '/:projectObjectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const object = await projectObjectService.updateProjectObject(
        req.params.projectObjectId,
        req.body
      );

      if (!object) {
        throw new ApiError(404, 'Project object not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(object));
    } catch (error) {
      next(error);
    }
  }
);

// Delete project object (admin only)
router.delete(
  '/:projectObjectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await projectObjectService.deleteProjectObject(req.params.projectObjectId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get dependencies
router.get(
  '/:projectObjectId/dependencies',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dependencies = await dependencyService.getDependenciesByProjectObject(
        req.params.projectObjectId
      );
      res.json(formatListResponse(dependencies, dependencies.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create dependency (analyst or admin)
router.post(
  '/:projectObjectId/dependencies',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dependsOnProjectObjectId } = req.body;

      if (!dependsOnProjectObjectId) {
        throw new ApiError(400, 'Depends on project object ID is required', 'MISSING_FIELD');
      }

      const dependency = await dependencyService.createDependency(
        req.params.projectObjectId,
        dependsOnProjectObjectId
      );

      res.status(201).json(formatSingleResponse(dependency));
    } catch (error) {
      next(error);
    }
  }
);

// Delete dependency (analyst or admin)
router.delete(
  '/dependency/:dependencyId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dependencyService.deleteDependency(req.params.dependencyId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
