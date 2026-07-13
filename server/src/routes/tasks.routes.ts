// server/src/routes/tasks.routes.ts
// Task and task group API routes

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import taskService from '../services/taskService.js';
import projectService from '../services/projectService.js';
import programService from '../services/programService.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

// ===== CYCLE-SCOPED TASK GROUPS =====

router.get(
  '/groups/cycle/:mockCycleId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      const groups = await taskService.getTaskGroupsByCycle(req.params.mockCycleId);
      res.json(formatListResponse(groups, groups.length));
    } catch (error) { next(error); }
  }
);

router.post(
  '/groups/cycle/:mockCycleId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      const { name, processArea, description, startDate, endDate } = req.body;
      if (!name) throw new ApiError(400, 'Task group name is required', 'MISSING_FIELD');
      const group = await taskService.createTaskGroupForCycle(req.params.mockCycleId, name, processArea, description, startDate, endDate);
      res.status(201).json(formatSingleResponse(group));
    } catch (error) { next(error); }
  }
);

// ===== CYCLE-SCOPED TASKS =====

router.get(
  '/cycle/:mockCycleId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      const filters = {
        status: req.query.status as string | undefined,
        taskType: req.query.taskType as string | undefined,
        draUserId: req.query.draUserId as string | undefined,
        developerUserId: req.query.developerUserId as string | undefined,
        projectObjectId: req.query.projectObjectId as string | undefined,
        taskGroupId: req.query.taskGroupId as string | undefined,
      };
      const tasks = await taskService.getTasksByCycle(req.params.mockCycleId, filters);
      res.json(formatListResponse(tasks, tasks.length));
    } catch (error) { next(error); }
  }
);

router.post(
  '/cycle/:mockCycleId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cycle = await programService.getMockCycleById(req.params.mockCycleId);
      if (!cycle) throw new ApiError(404, 'Mock cycle not found', 'NOT_FOUND');
      const { taskType, ...data } = req.body;
      if (!taskType) throw new ApiError(400, 'Task type is required', 'MISSING_FIELD');
      const task = await taskService.createTaskForCycle(req.params.mockCycleId, { taskType, ...data });
      res.status(201).json(formatSingleResponse(task));
    } catch (error) { next(error); }
  }
);

// Auto-create default tasks for a project object (cycle-scoped)
router.post('/defaults/project-object-cycle/:projectObjectId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { mockCycleId } = req.body;
    if (!mockCycleId) throw new ApiError(400, 'mockCycleId required', 'MISSING_FIELD');
    const tasks = await taskService.createDefaultTasksForCycle(mockCycleId, req.params.projectObjectId);
    res.status(201).json(formatListResponse(tasks, tasks.length));
  } catch (error) { next(error); }
});

// ===== TASK GROUPS =====

// Get task groups by project
router.get(
  '/groups/project/:projectId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const groups = await taskService.getTaskGroupsByProject(req.params.projectId);
      res.json(formatListResponse(groups, groups.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create task group (analyst or admin)
router.post(
  '/groups/project/:projectId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found', 'NOT_FOUND');
      }

      const { name, processArea, description, startDate, endDate } = req.body;

      if (!name) {
        throw new ApiError(400, 'Task group name is required', 'MISSING_FIELD');
      }

      const group = await taskService.createTaskGroup(
        req.params.projectId,
        name,
        processArea,
        description,
        startDate,
        endDate
      );

      res.status(201).json(formatSingleResponse(group));
    } catch (error) {
      next(error);
    }
  }
);

// Get task group by ID
router.get(
  '/groups/:taskGroupId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await taskService.getTaskGroupById(req.params.taskGroupId);

      if (!group) {
        throw new ApiError(404, 'Task group not found', 'NOT_FOUND');
      }

      const stats = await taskService.getTaskGroupStats(req.params.taskGroupId);
      const response = { ...group, stats };

      res.json(formatSingleResponse(response));
    } catch (error) {
      next(error);
    }
  }
);

// Update task group (analyst or admin)
router.patch(
  '/groups/:taskGroupId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await taskService.updateTaskGroup(req.params.taskGroupId, req.body);

      if (!group) {
        throw new ApiError(404, 'Task group not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(group));
    } catch (error) {
      next(error);
    }
  }
);

// Delete task group (analyst or admin)
router.delete(
  '/groups/:taskGroupId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await taskService.deleteTaskGroup(req.params.taskGroupId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ===== TASKS =====

// Get tasks by project with filters
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
        taskType: req.query.taskType as string | undefined,
        draUserId: req.query.draUserId as string | undefined,
        developerUserId: req.query.developerUserId as string | undefined,
        projectObjectId: req.query.projectObjectId as string | undefined,
        taskGroupId: req.query.taskGroupId as string | undefined,
      };

      const tasks = await taskService.getTasksByProject(req.params.projectId, filters);
      res.json(formatListResponse(tasks, tasks.length));
    } catch (error) {
      next(error);
    }
  }
);

// Create task (analyst or admin)
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

      const { taskType, ...data } = req.body;

      if (!taskType) {
        throw new ApiError(400, 'Task type is required', 'MISSING_FIELD');
      }

      const task = await taskService.createTask(req.params.projectId, {
        taskType,
        ...data,
      });

      res.status(201).json(formatSingleResponse(task));
    } catch (error) {
      next(error);
    }
  }
);

// Get task by ID
router.get('/:taskId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);

    if (!task) {
      throw new ApiError(404, 'Task not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(task));
  } catch (error) {
    next(error);
  }
});

// Update task (analyst or admin)
router.patch(
  '/:taskId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await taskService.updateTask(req.params.taskId, req.body);

      if (!task) {
        throw new ApiError(404, 'Task not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(task));
    } catch (error) {
      next(error);
    }
  }
);

// Delete task (analyst or admin)
router.delete(
  '/:taskId',
  requireAuth,
  requireRole('analyst', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await taskService.deleteTask(req.params.taskId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ===== TASK ATTACHMENTS =====

router.get('/:taskId/attachments', requireAuth, async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

    const attachments = await taskService.getTaskAttachments(req.params.taskId);
    res.json(formatListResponse(attachments, attachments.length));
  } catch (error) { next(error); }
});

router.post('/:taskId/attachments', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

    const fileName = String(req.body.fileName || '').trim();
    const mimeType = String(req.body.mimeType || '').trim() || 'application/octet-stream';
    const dataBase64 = String(req.body.dataBase64 || '').trim();

    if (!fileName || !dataBase64) {
      throw new ApiError(400, 'fileName and dataBase64 are required', 'MISSING_FIELD');
    }

    const attachment = await taskService.addTaskAttachment(req.params.taskId, {
      fileName,
      mimeType,
      dataBase64,
      uploadedByUserId: (req as any).userId,
    });

    res.status(201).json(formatSingleResponse(attachment));
  } catch (error) { next(error); }
});

router.get('/attachments/:attachmentId/download', requireAuth, async (req, res, next) => {
  try {
    const attachment = await taskService.getTaskAttachmentById(req.params.attachmentId);
    if (!attachment) throw new ApiError(404, 'Attachment not found', 'NOT_FOUND');

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.send(attachment.fileData);
  } catch (error) { next(error); }
});

router.delete('/attachments/:attachmentId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const attachment = await taskService.getTaskAttachmentById(req.params.attachmentId);
    if (!attachment) throw new ApiError(404, 'Attachment not found', 'NOT_FOUND');

    await taskService.deleteTaskAttachment(req.params.attachmentId);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// ===== TASK DEPENDENCIES =====

router.get('/:taskId/dependencies', requireAuth, async (req, res, next) => {
  try {
    const deps = await taskService.getTaskDependencies(req.params.taskId);
    res.json(formatListResponse(deps, deps.length));
  } catch (error) { next(error); }
});

router.post('/:taskId/dependencies', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { dependsOnTaskId } = req.body;
    if (!dependsOnTaskId) throw new ApiError(400, 'dependsOnTaskId required', 'MISSING_FIELD');
    await taskService.addTaskDependency(req.params.taskId, dependsOnTaskId);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/:taskId/dependencies/:dependsOnTaskId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    await taskService.removeTaskDependency(req.params.taskId, req.params.dependsOnTaskId);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// ===== TASK SUBTASKS =====

router.get('/:taskId/subtasks', requireAuth, async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');
    const subtasks = await taskService.getTaskSubtasks(req.params.taskId);
    res.json(formatListResponse(subtasks, subtasks.length));
  } catch (error) { next(error); }
});

router.post('/:taskId/subtasks', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

    const { title, description, status, assignedTo } = req.body || {};
    if (!title || !String(title).trim()) {
      throw new ApiError(400, 'Subtask title is required', 'MISSING_FIELD');
    }

    const allowedStatuses = ['not_started', 'in_progress', 'blocked', 'complete'];
    const normalizedStatus = status ? String(status).trim() : 'not_started';
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new ApiError(400, 'Invalid subtask status', 'INVALID_FIELD');
    }

    const subtask = await taskService.createTaskSubtask(req.params.taskId, {
      title: String(title).trim(),
      description: description ? String(description) : null,
      assignedTo: assignedTo ? String(assignedTo).trim() : null,
      status: normalizedStatus as any,
    });
    res.status(201).json(formatSingleResponse(subtask));
  } catch (error) { next(error); }
});

router.patch('/subtasks/:subtaskId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { title, description, status, assignedTo } = req.body || {};
    const updates: any = {};

    if (title !== undefined) {
      if (!String(title).trim()) {
        throw new ApiError(400, 'Subtask title cannot be empty', 'INVALID_FIELD');
      }
      updates.title = String(title).trim();
    }
    if (description !== undefined) {
      updates.description = description ? String(description) : null;
    }
    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo ? String(assignedTo).trim() : null;
    }
    if (status !== undefined) {
      const normalizedStatus = String(status).trim();
      const allowedStatuses = ['not_started', 'in_progress', 'blocked', 'complete'];
      if (!allowedStatuses.includes(normalizedStatus)) {
        throw new ApiError(400, 'Invalid subtask status', 'INVALID_FIELD');
      }
      updates.status = normalizedStatus;
    }

    const subtask = await taskService.updateTaskSubtask(req.params.subtaskId, updates);
    if (!subtask) throw new ApiError(404, 'Subtask not found', 'NOT_FOUND');
    res.json(formatSingleResponse(subtask));
  } catch (error) { next(error); }
});

router.delete('/subtasks/:subtaskId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const deleted = await taskService.deleteTaskSubtask(req.params.subtaskId);
    if (!deleted) throw new ApiError(404, 'Subtask not found', 'NOT_FOUND');
    res.json({ success: true });
  } catch (error) { next(error); }
});

// ===== DEFAULT TASK TEMPLATES =====

router.get('/templates/defaults', requireAuth, async (req, res, next) => {
  try {
    const templates = await taskService.getDefaultTaskTemplates();
    res.json(formatListResponse(templates, templates.length));
  } catch (error) { next(error); }
});

router.post('/templates/defaults', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const result = await taskService.createDefaultTaskTemplate(req.body);
    res.status(201).json(formatSingleResponse(result));
  } catch (error) { next(error); }
});

router.patch('/templates/defaults/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const result = await taskService.updateDefaultTaskTemplate(req.params.id, req.body);
    res.json(formatListResponse(result || [], (result || []).length));
  } catch (error) { next(error); }
});

router.delete('/templates/defaults/:id', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    await taskService.deleteDefaultTaskTemplate(req.params.id);
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Auto-create default tasks for a project object
router.post('/defaults/project-object/:projectObjectId', requireAuth, requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) throw new ApiError(400, 'projectId required', 'MISSING_FIELD');
    const tasks = await taskService.createDefaultTasksForProjectObject(projectId, req.params.projectObjectId);
    res.status(201).json(formatListResponse(tasks, tasks.length));
  } catch (error) { next(error); }
});

export default router;
