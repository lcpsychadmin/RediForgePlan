// server/src/routes/projects.routes.ts
// Project API routes

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import programService from '../services/programService.js';
import projectService from '../services/projectService.js';
import dataMigrationStrategyService from '../services/dataMigrationStrategyService.js';
import approvalWorkflowEngine from '../services/approvalWorkflowEngine.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();
const strategyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Get projects by program
router.get(
  '/by-program/:programId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await programService.getProgramById(req.params.programId);
      if (!program) {
        throw new ApiError(404, 'Program not found', 'NOT_FOUND');
      }

      const projects = await projectService.getProjectsByProgram(req.params.programId);
      res.json(formatListResponse(projects, projects.length));
    } catch (error) {
      next(error);
    }
  }
);

// Backward-compatible: get project owning this cycle
router.get(
  '/by-cycle/:mockCycleId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      const projects = await projectService.getProjectsByMockCycle(req.params.mockCycleId);
      res.json(formatListResponse(projects, projects.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create project (admin only)
router.post(
  '/by-program/:programId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await programService.getProgramById(req.params.programId);
      if (!program) {
        throw new ApiError(404, 'Program not found', 'NOT_FOUND');
      }

      const { name, description, startDate, endDate, accentColor } = req.body;

      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Project name, startDate, and endDate are required', 'MISSING_FIELD');
      }

      const project = await projectService.createProject(
        req.params.programId,
        name,
        description,
        startDate,
        endDate,
        accentColor
      );

      res.status(201).json(formatSingleResponse(project));
    } catch (error) {
      next(error);
    }
  }
);

// Backward-compatible: create project and assign cycle to it
router.post(
  '/by-cycle/:mockCycleId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) {
        throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      }

      const { name, description, startDate, endDate } = req.body;
      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Project name, startDate, and endDate are required', 'MISSING_FIELD');
      }

      const project = await projectService.createProject(
        cycle.programId,
        name,
        description,
        startDate,
        endDate
      );

      await programService.reassignMockCycleToProject(req.params.mockCycleId, project.id);

      res.status(201).json(formatSingleResponse(project));
    } catch (error) {
      next(error);
    }
  }
);

// Create mock cycle under a project (admin only)
router.post(
  '/:projectId/mock-cycles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const { name, startDate, endDate, scheduleMode, accentColor } = req.body;
      if (!name || !startDate || !endDate) {
        throw new ApiError(400, 'Mock cycle name, startDate, and endDate are required', 'MISSING_FIELD');
      }

      const cycle = await programService.createMockCycle(
        req.params.projectId,
        name,
        startDate,
        endDate,
        scheduleMode || 'all_days',
        accentColor
      );

      res.status(201).json(formatSingleResponse(cycle));
    } catch (error) {
      next(error);
    }
  }
);

// Get project by ID
router.get('/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);

    if (!project) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const stats = await projectService.getProjectStats(req.params.projectId);
    const response = { ...project, stats };

    res.json(formatSingleResponse(response));
  } catch (error) {
    next(error);
  }
});

// Get project workflow roles (Lead + Project Manager)
router.get('/:projectId/workflow-roles', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const roles = await projectService.getProjectWorkflowRoles(req.params.projectId);
    res.json(formatSingleResponse({ projectId: req.params.projectId, ...roles }));
  } catch (error) {
    next(error);
  }
});

// Get project data migration strategy payload
router.get('/:projectId/data-migration-strategy', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const strategy = await dataMigrationStrategyService.getStrategy(req.params.projectId);
    const cycles = await programService.getMockCyclesByProject(req.params.projectId);
    const cycleWorkflow = await Promise.all(
      cycles.map(async (cycle) => ({
        mockCycleId: cycle.id,
        workflow: await approvalWorkflowEngine.evaluateMockCycleProgression(cycle.id),
      }))
    );
    const documents = await dataMigrationStrategyService.listDocuments(req.params.projectId);

    res.json(formatSingleResponse({
      project,
      strategy,
      mockCycles: cycles,
      cycleWorkflow,
      documents,
    }));
  } catch (error) {
    next(error);
  }
});

// Save editable strategy sections
router.put(
  '/:projectId/data-migration-strategy',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const strategy = await dataMigrationStrategyService.upsertSections(
        req.params.projectId,
        req.body?.sections || {},
        (req as any).userId,
      );

      res.json(formatSingleResponse(strategy));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:projectId/data-migration-strategy/history/:sectionKey',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const sectionKey = String(req.params.sectionKey || '').trim();
      if (!dataMigrationStrategyService.isKnownSectionKey(sectionKey)) {
        throw new ApiError(400, 'Unknown section key', 'INVALID_FIELD');
      }

      const history = await dataMigrationStrategyService.listSectionHistory(req.params.projectId, sectionKey);
      res.json(formatListResponse(history, history.length));
    } catch (error) {
      next(error);
    }
  }
);

// Record strategy approval in sequence (Lead first, then Project Manager)
router.post(
  '/:projectId/data-migration-strategy/approvals/:role',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const roleParam = String(req.params.role || '').toLowerCase();
      const role = roleParam === 'lead'
        ? 'lead'
        : roleParam === 'project-manager' || roleParam === 'project_manager'
          ? 'project_manager'
          : null;

      if (!role) {
        throw new ApiError(400, 'role must be lead or project_manager', 'INVALID_FIELD');
      }

      const approved = req.body?.approved === false ? false : true;
      const strategy = await dataMigrationStrategyService.recordApproval({
        projectId: req.params.projectId,
        role,
        userId: (req as any).userId,
        approved,
      });

      res.json(formatSingleResponse(strategy));
    } catch (error: any) {
      if (error?.message && typeof error.message === 'string') {
        return next(new ApiError(400, error.message, 'INVALID_OPERATION'));
      }
      next(error);
    }
  }
);

// Upload supporting strategy documentation
router.post(
  '/:projectId/data-migration-strategy/documents',
  requireAuth,
  requireRole('analyst', 'admin'),
  strategyUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      if (!req.file) {
        throw new ApiError(400, 'file is required', 'MISSING_FIELD');
      }

      const uploaded = await dataMigrationStrategyService.uploadDocument({
        projectId: req.params.projectId,
        mockCycleId: (req.body?.mockCycleId || null) as string | null,
        documentType: String(req.body?.documentType || 'supporting_document'),
        fileName: req.file.originalname,
        mimeType: req.file.mimetype || 'application/octet-stream',
        fileSize: req.file.size || 0,
        fileContent: req.file.buffer,
        uploadedBy: (req as any).userId,
      });

      res.status(201).json(formatSingleResponse(uploaded));
    } catch (error) {
      next(error);
    }
  }
);

// List project strategy documents
router.get('/:projectId/data-migration-strategy/documents', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const docs = await dataMigrationStrategyService.listDocuments(req.params.projectId);
    res.json(formatListResponse(docs, docs.length));
  } catch (error) {
    next(error);
  }
});

// Download a strategy document binary
router.get('/:projectId/data-migration-strategy/documents/:documentId/download', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await dataMigrationStrategyService.getDocument(req.params.projectId, req.params.documentId);
    if (!doc) {
      throw new ApiError(404, 'Document not found', 'NOT_FOUND');
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(doc.file_content);
  } catch (error) {
    next(error);
  }
});

// Delete strategy document
router.delete(
  '/:projectId/data-migration-strategy/documents/:documentId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dataMigrationStrategyService.deleteDocument(req.params.projectId, req.params.documentId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Export consolidated strategy document
router.get('/:projectId/data-migration-strategy/export', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const markdown = await dataMigrationStrategyService.exportMarkdown(req.params.projectId);
    if (!markdown) {
      throw new ApiError(404, 'Project not found', 'NOT_FOUND');
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="data-migration-strategy-${req.params.projectId}-${stamp}.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

// Save project workflow roles (Lead + Project Manager)
router.put(
  '/:projectId/workflow-roles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const roles = await projectService.saveProjectWorkflowRoles(req.params.projectId, {
        leadUserId: req.body?.leadUserId ?? undefined,
        projectManagerUserId: req.body?.projectManagerUserId ?? undefined,
      });

      res.json(formatSingleResponse({ projectId: req.params.projectId, ...roles }));
    } catch (error) {
      next(error);
    }
  }
);

// Update project (admin only)
router.patch(
  '/:projectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mockCycleId, ...projectPatch } = req.body || {};

      if (mockCycleId !== undefined) {
        if (typeof mockCycleId !== 'string' || !mockCycleId) {
          throw new ApiError(400, 'mockCycleId must be a non-empty string', 'INVALID_FIELD');
        }

        const reassigned = await programService.reassignMockCycleToProject(mockCycleId, req.params.projectId);
        if (!reassigned) {
          throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
        }
      }

      const project = await projectService.updateProject(req.params.projectId, projectPatch);

      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(project));
    } catch (error) {
      next(error);
    }
  }
);

// Delete project (admin only)
router.delete(
  '/:projectId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cascade = String(req.query?.cascade || '').toLowerCase() === 'true';
      await projectService.deleteProject(req.params.projectId, { cascade });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
