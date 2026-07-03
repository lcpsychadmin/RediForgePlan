import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface CreateDefectInput {
  projectObjectId?: string | null;
  issueTypeId?: string | null;
  title: string;
  defectDetails?: string;
  rootCauseDetails?: string;
  resolutionDetails?: string;
  severity: DefectSeverity;
  status?: DefectStatus;
  assignedToUserId?: string | null;
  rootCauseCategoryId?: string | null;
  targetResolutionDate?: string | null;
  createdByUserId: string;
  description?: string; // Backward compatibility.
}

export interface UpdateDefectInput {
  title?: string;
  defectDetails?: string;
  rootCauseDetails?: string;
  resolutionDetails?: string;
  severity?: DefectSeverity;
  status?: DefectStatus;
  assignedToUserId?: string | null;
  rootCauseCategoryId?: string | null;
  targetResolutionDate?: string | null;
  description?: string; // Backward compatibility.
}

export interface DefectListFilters {
  statuses?: DefectStatus[];
  search?: string;
}

export interface CreateRootCauseCategoryInput {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateRootCauseCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateDefectAttachmentInput {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  uploadedByUserId: string;
}

class DefectsService {
  async getDefectsForProject(projectId: string, filters?: DefectListFilters) {
    const params: any[] = [projectId];
    let paramIndex = 2;
    const whereClauses: string[] = ['t.project_id = $1'];

    if (filters?.statuses?.length) {
      whereClauses.push(`d.status = ANY($${paramIndex}::defect_status_enum[])`);
      params.push(filters.statuses);
      paramIndex++;
    }

    if (filters?.search?.trim()) {
      whereClauses.push(`(
        d.title ILIKE $${paramIndex}
        OR COALESCE(d.defect_details, d.description, '') ILIKE $${paramIndex}
        OR COALESCE(d.root_cause_details, '') ILIKE $${paramIndex}
        OR COALESCE(d.resolution_details, '') ILIKE $${paramIndex}
        OR COALESCE(rc.name, '') ILIKE $${paramIndex}
        OR COALESCE(t.name, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    const result = await db.query(
          `SELECT d.id, d.defect_number, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.defect_details, d.root_cause_details, d.resolution_details,
              d.root_cause_category_id, d.target_resolution_date,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id,
            go.object_id,
            COALESCE(go.process_area, tg.process_area) AS process_area,
            pr.name AS program_name,
            p.name AS project_name,
              p.accent_color AS project_accent_color,
            mc.name AS mock_cycle_name,
              rc.name AS root_cause_category_name,
              t.name AS task_name,
              t.task_type,
              t.status AS task_status,
            p.name AS project_name
       FROM defects d
       JOIN tasks t ON d.task_id = t.id
       JOIN projects p ON t.project_id = p.id
           LEFT JOIN programs pr ON p.program_id = pr.id
           LEFT JOIN mock_cycles mc ON mc.project_id = p.id
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
           LEFT JOIN global_objects go ON po.global_object_id = go.id
           LEFT JOIN task_groups tg ON t.task_group_id = tg.id
       LEFT JOIN defect_root_cause_categories rc ON d.root_cause_category_id = rc.id
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY d.updated_at DESC, d.created_at DESC`,
      params
    );

    return result.rows.map((row) => this.format(row));
  }

  async createDefect(taskId: string, data: CreateDefectInput) {
    const taskResult = await db.query(
      'SELECT id, project_object_id FROM tasks WHERE id = $1',
      [taskId]
    );
    if (taskResult.rows.length === 0) {
      throw new ApiError(404, 'Task not found', 'NOT_FOUND');
    }

    const task = taskResult.rows[0];

    if (data.issueTypeId) {
      const issueTypeResult = await db.query(
        'SELECT id, task_id FROM task_issue_types WHERE id = $1',
        [data.issueTypeId]
      );
      if (issueTypeResult.rows.length === 0) {
        throw new ApiError(404, 'Issue type not found', 'NOT_FOUND');
      }
      if (issueTypeResult.rows[0].task_id !== taskId) {
        throw new ApiError(400, 'issueTypeId must belong to the same task', 'VALIDATION_ERROR');
      }
    }

    const effectiveProjectObjectId = data.projectObjectId || task.project_object_id || null;

    if (effectiveProjectObjectId) {
      const objectResult = await db.query(
        'SELECT id FROM project_objects WHERE id = $1',
        [effectiveProjectObjectId]
      );
      if (objectResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid projectObjectId', 'INVALID_REFERENCE');
      }
    }

    if (data.assignedToUserId) {
      const assignedUserResult = await db.query('SELECT id FROM users WHERE id = $1', [data.assignedToUserId]);
      if (assignedUserResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid assignedToUserId', 'INVALID_REFERENCE');
      }
    }

    if (data.rootCauseCategoryId) {
      const rootCauseResult = await db.query(
        'SELECT id FROM defect_root_cause_categories WHERE id = $1',
        [data.rootCauseCategoryId]
      );
      if (rootCauseResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid rootCauseCategoryId', 'INVALID_REFERENCE');
      }
    }

    const creatorResult = await db.query('SELECT id FROM users WHERE id = $1', [data.createdByUserId]);
    if (creatorResult.rows.length === 0) {
      throw new ApiError(400, 'Invalid createdByUserId', 'INVALID_REFERENCE');
    }

    const defectDetails = data.defectDetails ?? data.description ?? null;

    const result = await db.query(
      `INSERT INTO defects (
         task_id, project_object_id, issue_type_id, title,
         defect_details, root_cause_details, resolution_details,
         severity, status, assigned_to_user_id,
         root_cause_category_id, target_resolution_date,
         created_by_user_id
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         $8, $9, $10,
         $11, $12,
         $13
       )
       RETURNING id`,
      [
        taskId,
        effectiveProjectObjectId,
        data.issueTypeId || null,
        data.title,
        defectDetails,
        data.rootCauseDetails || null,
        data.resolutionDetails || null,
        data.severity,
        data.status || 'open',
        data.assignedToUserId || null,
        data.rootCauseCategoryId || null,
        data.targetResolutionDate || null,
        data.createdByUserId,
      ]
    );

    const created = await this.getDefect(result.rows[0].id);
    if (!created) {
      throw new ApiError(500, 'Failed to create defect', 'CREATE_FAILED');
    }

    await this.recordAuditAction(created.id, data.createdByUserId, 'create', null, created);

    return created;
  }

  async getDefectsForTask(taskId: string) {
    const result = await db.query(
          `SELECT d.id, d.defect_number, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.defect_details, d.root_cause_details, d.resolution_details,
              d.root_cause_category_id, d.target_resolution_date,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id,
            go.object_id,
            COALESCE(go.process_area, tg.process_area) AS process_area,
            pr.name AS program_name,
            p.name AS project_name,
              p.accent_color AS project_accent_color,
            mc.name AS mock_cycle_name,
              rc.name AS root_cause_category_name
       FROM defects d
           JOIN tasks t ON d.task_id = t.id
           JOIN projects p ON t.project_id = p.id
           LEFT JOIN programs pr ON p.program_id = pr.id
           LEFT JOIN mock_cycles mc ON mc.project_id = p.id
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
           LEFT JOIN global_objects go ON po.global_object_id = go.id
           LEFT JOIN task_groups tg ON t.task_group_id = tg.id
       LEFT JOIN defect_root_cause_categories rc ON d.root_cause_category_id = rc.id
       WHERE d.task_id = $1
       ORDER BY d.created_at DESC`,
      [taskId]
    );

    return result.rows.map((row) => this.format(row));
  }

  async getDefect(defectId: string) {
    const result = await db.query(
      `SELECT d.id, d.defect_number, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.defect_details, d.root_cause_details, d.resolution_details,
              d.root_cause_category_id, d.target_resolution_date,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id,
              go.object_id,
              COALESCE(go.process_area, tg.process_area) AS process_area,
              pr.name AS program_name,
              p.name AS project_name,
              p.accent_color AS project_accent_color,
              mc.name AS mock_cycle_name,
              rc.name AS root_cause_category_name,
              t.name AS task_name
       FROM defects d
       JOIN tasks t ON d.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN programs pr ON p.program_id = pr.id
       LEFT JOIN mock_cycles mc ON mc.project_id = p.id
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       LEFT JOIN task_groups tg ON t.task_group_id = tg.id
       LEFT JOIN defect_root_cause_categories rc ON d.root_cause_category_id = rc.id
       WHERE d.id = $1`,
      [defectId]
    );

    if (result.rows.length === 0) return null;
    return this.format(result.rows[0]);
  }

  async updateDefect(defectId: string, updates: UpdateDefectInput, userId?: string) {
    const existingRawResult = await db.query(
      'SELECT id, status FROM defects WHERE id = $1',
      [defectId]
    );

    if (existingRawResult.rows.length === 0) return null;

    const before = await this.getDefect(defectId);

    const fields: string[] = [];
    const values: any[] = [defectId];
    let param = 2;

    const fieldMap: Record<string, string> = {
      title: 'title',
      defectDetails: 'defect_details',
      rootCauseDetails: 'root_cause_details',
      resolutionDetails: 'resolution_details',
      severity: 'severity',
      status: 'status',
      assignedToUserId: 'assigned_to_user_id',
      rootCauseCategoryId: 'root_cause_category_id',
      targetResolutionDate: 'target_resolution_date',
    };

    if (updates.description !== undefined && updates.defectDetails === undefined) {
      updates.defectDetails = updates.description;
    }

    if (updates.assignedToUserId) {
      const assignedUserResult = await db.query('SELECT id FROM users WHERE id = $1', [updates.assignedToUserId]);
      if (assignedUserResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid assignedToUserId', 'INVALID_REFERENCE');
      }
    }

    if (updates.rootCauseCategoryId) {
      const rootCauseResult = await db.query(
        'SELECT id FROM defect_root_cause_categories WHERE id = $1',
        [updates.rootCauseCategoryId]
      );
      if (rootCauseResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid rootCauseCategoryId', 'INVALID_REFERENCE');
      }
    }

    for (const [key, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        fields.push(`${column} = $${param}`);
        values.push((updates as any)[key]);
        param++;
      }
    }

    if (updates.status !== undefined) {
      const previousStatus = existingRawResult.rows[0].status as DefectStatus;
      if (updates.status === 'closed' && previousStatus !== 'closed') {
        fields.push('resolved_at = CURRENT_TIMESTAMP');
      }
      if (updates.status !== 'closed' && previousStatus === 'closed') {
        fields.push('resolved_at = NULL');
      }
    }

    if (fields.length === 0) return this.getDefect(defectId);

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE defects
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id`,
      values
    );

    if (result.rows.length === 0) return null;

    const updated = await this.getDefect(defectId);
    if (updated && before && userId) {
      await this.recordAuditAction(defectId, userId, 'update', before, updated);
    }

    return updated;
  }

  async deleteDefect(defectId: string, userId?: string) {
    const before = await this.getDefect(defectId);
    const result = await db.query('DELETE FROM defects WHERE id = $1 RETURNING id', [defectId]);
    const deleted = result.rows.length > 0;

    if (deleted && before && userId) {
      await this.recordAuditAction(defectId, userId, 'delete', before, null);
    }

    return deleted;
  }

  async getRootCauseCategories() {
    const result = await db.query(
      `SELECT id, name, sort_order, is_active, created_at, updated_at
       FROM defect_root_cause_categories
       ORDER BY sort_order ASC, name ASC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createRootCauseCategory(input: CreateRootCauseCategoryInput) {
    const result = await db.query(
      `INSERT INTO defect_root_cause_categories (name, sort_order, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, sort_order, is_active, created_at, updated_at`,
      [input.name.trim(), input.sortOrder || 0, input.isActive ?? true]
    );

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      sortOrder: result.rows[0].sort_order,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async updateRootCauseCategory(categoryId: string, updates: UpdateRootCauseCategoryInput) {
    const fields: string[] = [];
    const values: any[] = [categoryId];
    let param = 2;

    if (updates.name !== undefined) {
      fields.push(`name = $${param}`);
      values.push(updates.name.trim());
      param++;
    }
    if (updates.sortOrder !== undefined) {
      fields.push(`sort_order = $${param}`);
      values.push(updates.sortOrder);
      param++;
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${param}`);
      values.push(updates.isActive);
      param++;
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE defect_root_cause_categories
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id, name, sort_order, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      sortOrder: result.rows[0].sort_order,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async deleteRootCauseCategory(categoryId: string) {
    const inUse = await db.query(
      'SELECT COUNT(*)::int AS count FROM defects WHERE root_cause_category_id = $1',
      [categoryId]
    );

    if ((inUse.rows[0]?.count || 0) > 0) {
      throw new ApiError(400, 'Cannot delete category while defects reference it', 'VALIDATION_ERROR');
    }

    const result = await db.query('DELETE FROM defect_root_cause_categories WHERE id = $1 RETURNING id', [categoryId]);
    return result.rows.length > 0;
  }

  async getDefectHistory(defectId: string) {
    const result = await db.query(
      `SELECT al.id, al.action, al.before_data, al.after_data, al.created_at,
              al.user_id, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'defect'
         AND al.entity_id = $1
       ORDER BY al.created_at DESC`,
      [defectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      beforeData: row.before_data,
      afterData: row.after_data,
      createdAt: row.created_at,
      userId: row.user_id,
      userEmail: row.user_email,
    }));
  }

  async recordAuditAction(defectId: string, userId: string, action: string, beforeData: any, afterData: any) {
    await db.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, before_data, after_data)
       VALUES ($1, 'defect', $2, $3, $4, $5)`,
      [userId, defectId, action, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null]
    );
  }

  async getAttachments(defectId: string) {
    const result = await db.query(
      `SELECT da.id, da.defect_id, da.file_name, da.mime_type, da.file_size,
              da.uploaded_by_user_id, da.created_at, u.email AS uploaded_by_user_email
       FROM defect_attachments da
       LEFT JOIN users u ON da.uploaded_by_user_id = u.id
       WHERE da.defect_id = $1
       ORDER BY da.created_at DESC`,
      [defectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      defectId: row.defect_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedByUserId: row.uploaded_by_user_id,
      uploadedByUserEmail: row.uploaded_by_user_email,
      createdAt: row.created_at,
    }));
  }

  async addAttachment(defectId: string, input: CreateDefectAttachmentInput) {
    const fileBuffer = Buffer.from(input.dataBase64, 'base64');
    if (!fileBuffer.length) {
      throw new ApiError(400, 'Attachment payload is empty', 'VALIDATION_ERROR');
    }

    const result = await db.query(
      `INSERT INTO defect_attachments (
         defect_id, file_name, mime_type, file_size, file_data, uploaded_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, defect_id, file_name, mime_type, file_size, uploaded_by_user_id, created_at`,
      [
        defectId,
        input.fileName,
        input.mimeType,
        fileBuffer.length,
        fileBuffer,
        input.uploadedByUserId,
      ]
    );

    return {
      id: result.rows[0].id,
      defectId: result.rows[0].defect_id,
      fileName: result.rows[0].file_name,
      mimeType: result.rows[0].mime_type,
      fileSize: result.rows[0].file_size,
      uploadedByUserId: result.rows[0].uploaded_by_user_id,
      createdAt: result.rows[0].created_at,
    };
  }

  async getAttachmentById(attachmentId: string) {
    const result = await db.query(
      `SELECT id, defect_id, file_name, mime_type, file_size, file_data, uploaded_by_user_id, created_at
       FROM defect_attachments
       WHERE id = $1`,
      [attachmentId]
    );

    if (result.rows.length === 0) return null;

    return {
      id: result.rows[0].id,
      defectId: result.rows[0].defect_id,
      fileName: result.rows[0].file_name,
      mimeType: result.rows[0].mime_type,
      fileSize: result.rows[0].file_size,
      fileData: result.rows[0].file_data,
      uploadedByUserId: result.rows[0].uploaded_by_user_id,
      createdAt: result.rows[0].created_at,
    };
  }

  async deleteAttachment(attachmentId: string) {
    const result = await db.query('DELETE FROM defect_attachments WHERE id = $1 RETURNING id', [attachmentId]);
    return result.rows.length > 0;
  }

  private format(row: any) {
    return {
      id: row.id,
      defectNumber: row.defect_number,
      taskId: row.task_id,
      taskName: row.task_name,
      projectObjectId: row.project_object_id,
      objectId: row.object_id,
      processArea: row.process_area,
      programName: row.program_name,
      projectName: row.project_name,
      projectAccentColor: row.project_accent_color,
      mockCycleName: row.mock_cycle_name,
      issueTypeId: row.issue_type_id,
      title: row.title,
      defectDetails: row.defect_details || row.description || '',
      rootCauseDetails: row.root_cause_details || '',
      resolutionDetails: row.resolution_details || '',
      rootCauseCategoryId: row.root_cause_category_id,
      rootCauseCategoryName: row.root_cause_category_name,
      targetResolutionDate: row.target_resolution_date,
      severity: row.severity,
      status: row.status,
      assignedToUserId: row.assigned_to_user_id,
      assignedToUserEmail: row.assigned_to_user_email,
      createdByUserId: row.created_by_user_id,
      createdByUserEmail: row.created_by_user_email,
      issueCode: row.issue_code,
      issueDescription: row.issue_description,
      globalObjectId: row.global_object_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
    };
  }
}

export default new DefectsService();
