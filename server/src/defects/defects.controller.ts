import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import defectCommentsService from '../services/defectCommentsService.js';
import taskService from '../services/taskService.js';
import defectsService, { DefectSeverity, DefectStatus } from './defects.service.js';

const SEVERITIES: DefectSeverity[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

class DefectsController {
  async getRootCauseCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await defectsService.getRootCauseCategories();
      res.json(formatListResponse(categories, categories.length));
    } catch (error) {
      next(error);
    }
  }

  async createRootCauseCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) {
        throw new ApiError(400, 'name is required', 'MISSING_FIELD');
      }

      const category = await defectsService.createRootCauseCategory({
        name,
        sortOrder: req.body.sortOrder,
        isActive: req.body.isActive,
      });

      res.status(201).json(formatSingleResponse(category));
    } catch (error) {
      next(error);
    }
  }

  async updateRootCauseCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await defectsService.updateRootCauseCategory(req.params.categoryId, {
        name: req.body.name,
        sortOrder: req.body.sortOrder,
        isActive: req.body.isActive,
      });

      if (!category) {
        throw new ApiError(404, 'Root cause category not found', 'NOT_FOUND');
      }

      res.json(formatSingleResponse(category));
    } catch (error) {
      next(error);
    }
  }

  async deleteRootCauseCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await defectsService.deleteRootCauseCategory(req.params.categoryId);
      if (!deleted) {
        throw new ApiError(404, 'Root cause category not found', 'NOT_FOUND');
      }

      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async getDefectsForProject(req: Request, res: Response, next: NextFunction) {
    try {
      const statusesRaw = String(req.query.statuses || '').trim();
      const statuses: DefectStatus[] = statusesRaw
        ? (statusesRaw.split(',').map((status) => status.trim()).filter(Boolean) as DefectStatus[])
        : ['open', 'in_progress'];

      const defects = await defectsService.getDefectsForProject(req.params.projectId, {
        statuses,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      res.json(formatListResponse(defects, defects.length));
    } catch (error) {
      next(error);
    }
  }

  async createDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const title = (req.body.title || '').trim();
      const severity = req.body.severity as DefectSeverity;

      if (!title) throw new ApiError(400, 'title is required', 'MISSING_FIELD');
      if (!SEVERITIES.includes(severity)) {
        throw new ApiError(400, 'severity must be one of low, medium, high, critical', 'VALIDATION_ERROR');
      }

      const defect = await defectsService.createDefect(taskId, {
        projectObjectId: req.body.projectObjectId,
        issueTypeId: req.body.issueTypeId,
        title,
        defectDetails: req.body.defectDetails,
        rootCauseDetails: req.body.rootCauseDetails,
        resolutionDetails: req.body.resolutionDetails,
        rootCauseCategoryId: req.body.rootCauseCategoryId,
        targetResolutionDate: req.body.targetResolutionDate,
        description: req.body.description,
        severity,
        status: req.body.status,
        assignedToUserId: req.body.assignedToUserId,
        createdByUserId: (req as any).userId,
      });

      res.status(201).json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async getDefectsForTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const task = await taskService.getTaskById(taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const defects = await defectsService.getDefectsForTask(taskId);
      res.json(formatListResponse(defects, defects.length));
    } catch (error) {
      next(error);
    }
  }

  async getDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(defect.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      res.json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async updateDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await defectsService.getDefect(req.params.defectId);
      if (!existing) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(existing.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      const updates: any = {};

      if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
      if (req.body.defectDetails !== undefined) updates.defectDetails = req.body.defectDetails;
      if (req.body.rootCauseDetails !== undefined) updates.rootCauseDetails = req.body.rootCauseDetails;
      if (req.body.resolutionDetails !== undefined) updates.resolutionDetails = req.body.resolutionDetails;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.severity !== undefined) {
        if (!SEVERITIES.includes(req.body.severity)) {
          throw new ApiError(400, 'severity must be one of low, medium, high, critical', 'VALIDATION_ERROR');
        }
        updates.severity = req.body.severity;
      }
      if (req.body.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) {
          throw new ApiError(400, 'status must be one of open, in_progress, resolved, closed', 'VALIDATION_ERROR');
        }
        updates.status = req.body.status;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'assignedToUserId')) {
        updates.assignedToUserId = req.body.assignedToUserId || null;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'rootCauseCategoryId')) {
        updates.rootCauseCategoryId = req.body.rootCauseCategoryId || null;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'targetResolutionDate')) {
        updates.targetResolutionDate = req.body.targetResolutionDate || null;
      }

      const defect = await defectsService.updateDefect(req.params.defectId, updates, (req as any).userId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      res.json(formatSingleResponse(defect));
    } catch (error) {
      next(error);
    }
  }

  async deleteDefect(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await defectsService.getDefect(req.params.defectId);
      if (!existing) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const task = await taskService.getTaskById(existing.taskId);
      if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND');

      await defectsService.deleteDefect(req.params.defectId, (req as any).userId);
      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async getDefectHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const history = await defectsService.getDefectHistory(req.params.defectId);
      res.json(formatListResponse(history, history.length));
    } catch (error) {
      next(error);
    }
  }

  async getDefectAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const attachments = await defectsService.getAttachments(req.params.defectId);
      res.json(formatListResponse(attachments, attachments.length));
    } catch (error) {
      next(error);
    }
  }

  async addDefectAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const fileName = String(req.body.fileName || '').trim();
      const mimeType = String(req.body.mimeType || '').trim() || 'application/octet-stream';
      const dataBase64 = String(req.body.dataBase64 || '').trim();

      if (!fileName || !dataBase64) {
        throw new ApiError(400, 'fileName and dataBase64 are required', 'MISSING_FIELD');
      }

      const attachment = await defectsService.addAttachment(req.params.defectId, {
        fileName,
        mimeType,
        dataBase64,
        uploadedByUserId: (req as any).userId,
      });

      await defectsService.recordAuditAction(
        req.params.defectId,
        (req as any).userId,
        'attachment_add',
        null,
        { id: attachment.id, fileName: attachment.fileName, fileSize: attachment.fileSize }
      );

      res.status(201).json(formatSingleResponse(attachment));
    } catch (error) {
      next(error);
    }
  }

  async downloadDefectAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachment = await defectsService.getAttachmentById(req.params.attachmentId);
      if (!attachment) throw new ApiError(404, 'Attachment not found', 'NOT_FOUND');

      res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.send(attachment.fileData);
    } catch (error) {
      next(error);
    }
  }

  async deleteDefectAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachment = await defectsService.getAttachmentById(req.params.attachmentId);
      if (!attachment) throw new ApiError(404, 'Attachment not found', 'NOT_FOUND');

      await defectsService.deleteAttachment(req.params.attachmentId);

      await defectsService.recordAuditAction(
        attachment.defectId,
        (req as any).userId,
        'attachment_delete',
        { id: attachment.id, fileName: attachment.fileName, fileSize: attachment.fileSize },
        null
      );

      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async getDefectComments(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const comments = await defectCommentsService.getComments(req.params.defectId);
      res.json(formatListResponse(comments, comments.length));
    } catch (error) {
      next(error);
    }
  }

  async addDefectComment(req: Request, res: Response, next: NextFunction) {
    try {
      const defect = await defectsService.getDefect(req.params.defectId);
      if (!defect) throw new ApiError(404, 'Defect not found', 'NOT_FOUND');

      const content = String(req.body.content || '').trim();
      if (!content) {
        throw new ApiError(400, 'Content required', 'MISSING_FIELD');
      }

      const authorEmail = String((req as any).userEmail || '').trim();
      const authorName = authorEmail.split('@')[0] || 'User';
      const comment = await defectCommentsService.addComment(req.params.defectId, authorName, authorEmail, content);

      await defectsService.recordAuditAction(
        req.params.defectId,
        (req as any).userId,
        'comment_add',
        null,
        { id: comment.id, content: comment.content }
      );

      res.status(201).json(formatSingleResponse(comment));
    } catch (error) {
      next(error);
    }
  }

  async deleteDefectComment(req: Request, res: Response, next: NextFunction) {
    try {
      await defectCommentsService.deleteComment(req.params.commentId);
      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export default new DefectsController();
