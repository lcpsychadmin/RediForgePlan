import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface CreateDefectInput {
  projectObjectId?: string | null;
  issueTypeId?: string | null;
  title: string;
  description?: string;
  severity: DefectSeverity;
  assignedToUserId?: string | null;
  createdByUserId: string;
}

export interface UpdateDefectInput {
  title?: string;
  description?: string;
  severity?: DefectSeverity;
  status?: DefectStatus;
  assignedToUserId?: string | null;
  resolvedAt?: string | null;
}

export interface DefectListFilters {
  statuses?: DefectStatus[];
  search?: string;
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
        OR COALESCE(d.description, '') ILIKE $${paramIndex}
        OR COALESCE(t.name, '') ILIKE $${paramIndex}
        OR COALESCE(t.task_type, '') ILIKE $${paramIndex}
        OR COALESCE(it.issue_code, '') ILIKE $${paramIndex}
        OR COALESCE(it.issue_description, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search.trim()}%`);
      paramIndex++;
    }

    const result = await db.query(
      `SELECT d.id, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id,
              t.name AS task_name,
              t.task_type,
              t.status AS task_status,
              p.name AS project_name
       FROM defects d
       JOIN tasks t ON d.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
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

    const creatorResult = await db.query('SELECT id FROM users WHERE id = $1', [data.createdByUserId]);
    if (creatorResult.rows.length === 0) {
      throw new ApiError(400, 'Invalid createdByUserId', 'INVALID_REFERENCE');
    }

    const result = await db.query(
      `INSERT INTO defects (
         task_id, project_object_id, issue_type_id, title, description, severity,
         status, assigned_to_user_id, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
       RETURNING id`,
      [
        taskId,
        effectiveProjectObjectId,
        data.issueTypeId || null,
        data.title,
        data.description || null,
        data.severity,
        data.assignedToUserId || null,
        data.createdByUserId,
      ]
    );

    return this.getDefect(result.rows[0].id);
  }

  async getDefectsForTask(taskId: string) {
    const result = await db.query(
      `SELECT d.id, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id
       FROM defects d
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
       WHERE d.task_id = $1
       ORDER BY d.created_at DESC`,
      [taskId]
    );

    return result.rows.map((row) => this.format(row));
  }

  async getDefect(defectId: string) {
    const result = await db.query(
      `SELECT d.id, d.task_id, d.project_object_id, d.issue_type_id, d.title, d.description,
              d.severity, d.status, d.assigned_to_user_id, d.created_by_user_id,
              d.created_at, d.updated_at, d.resolved_at,
              tu.email AS assigned_to_user_email,
              cu.email AS created_by_user_email,
              it.issue_code,
              it.issue_description,
              po.global_object_id
       FROM defects d
       LEFT JOIN users tu ON d.assigned_to_user_id = tu.id
       LEFT JOIN users cu ON d.created_by_user_id = cu.id
       LEFT JOIN task_issue_types it ON d.issue_type_id = it.id
       LEFT JOIN project_objects po ON d.project_object_id = po.id
       WHERE d.id = $1`,
      [defectId]
    );

    if (result.rows.length === 0) return null;
    return this.format(result.rows[0]);
  }

  async updateDefect(defectId: string, updates: UpdateDefectInput) {
    const fields: string[] = [];
    const values: any[] = [defectId];
    let param = 2;

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      severity: 'severity',
      status: 'status',
      assignedToUserId: 'assigned_to_user_id',
      resolvedAt: 'resolved_at',
    };

    if (updates.assignedToUserId) {
      const assignedUserResult = await db.query('SELECT id FROM users WHERE id = $1', [updates.assignedToUserId]);
      if (assignedUserResult.rows.length === 0) {
        throw new ApiError(400, 'Invalid assignedToUserId', 'INVALID_REFERENCE');
      }
    }

    for (const [key, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        fields.push(`${column} = $${param}`);
        values.push((updates as any)[key]);
        param++;
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
    return this.getDefect(defectId);
  }

  async deleteDefect(defectId: string) {
    const result = await db.query('DELETE FROM defects WHERE id = $1 RETURNING id', [defectId]);
    return result.rows.length > 0;
  }

  private format(row: any) {
    return {
      id: row.id,
      taskId: row.task_id,
      projectObjectId: row.project_object_id,
      issueTypeId: row.issue_type_id,
      title: row.title,
      description: row.description,
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
