// server/src/services/dependencyService.ts
// Dependency, schedule, and audit database operations

import db from '../db.js';

export class DependencyService {
  async getDependenciesByProjectObject(projectObjectId: string) {
    const result = await db.query(
      `SELECT od.id, od.project_object_id, od.depends_on_project_object_id, od.created_at,
              go.object_id as depends_on_object_id
       FROM object_dependencies od
       JOIN project_objects po ON od.depends_on_project_object_id = po.id
       JOIN global_objects go ON po.global_object_id = go.id
       WHERE od.project_object_id = $1
       ORDER BY od.created_at DESC`,
      [projectObjectId]
    );
    return result.rows.map(row => this.formatDependency(row));
  }

  async createDependency(projectObjectId: string, dependsOnProjectObjectId: string) {
    // Validate both objects exist
    const obj1 = await db.query('SELECT id FROM project_objects WHERE id = $1', [projectObjectId]);
    const obj2 = await db.query('SELECT id FROM project_objects WHERE id = $1', [dependsOnProjectObjectId]);

    if (obj1.rows.length === 0 || obj2.rows.length === 0) {
      throw new Error('Invalid project object reference');
    }

    const result = await db.query(
      'INSERT INTO object_dependencies (project_object_id, depends_on_project_object_id) VALUES ($1, $2) RETURNING id, project_object_id, depends_on_project_object_id, created_at',
      [projectObjectId, dependsOnProjectObjectId]
    );
    return this.formatDependency(result.rows[0]);
  }

  async deleteDependency(dependencyId: string) {
    const result = await db.query(
      'DELETE FROM object_dependencies WHERE id = $1 RETURNING id',
      [dependencyId]
    );
    return result.rows.length > 0;
  }

  private formatDependency(row: any) {
    return {
      id: row.id,
      projectObjectId: row.project_object_id,
      dependsOnProjectObjectId: row.depends_on_project_object_id,
      dependsOnObjectId: row.depends_on_object_id,
      createdAt: row.created_at,
    };
  }
}

export class ScheduleService {
  async getScheduleByProject(projectId: string) {
    const result = await db.query(
      `SELECT si.id, si.project_id, si.task_id, si.scheduled_date, si.created_at,
              t.task_type, t.name, t.status, po.id as project_object_id, go.object_id
       FROM schedule_items si
       JOIN tasks t ON si.task_id = t.id
       LEFT JOIN project_objects po ON t.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       WHERE si.project_id = $1
       ORDER BY si.scheduled_date ASC`,
      [projectId]
    );
    return result.rows.map(row => this.formatScheduleItem(row));
  }

  async createScheduleItem(projectId: string, taskId: string, scheduledDate: string) {
    const result = await db.query(
      'INSERT INTO schedule_items (project_id, task_id, scheduled_date) VALUES ($1, $2, $3) RETURNING id, project_id, task_id, scheduled_date, created_at',
      [projectId, taskId, scheduledDate]
    );

    // Fetch with full data
    const full = await db.query(
      `SELECT si.id, si.project_id, si.task_id, si.scheduled_date, si.created_at,
              t.task_type, t.name, t.status, po.id as project_object_id, go.object_id
       FROM schedule_items si
       JOIN tasks t ON si.task_id = t.id
       LEFT JOIN project_objects po ON t.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       WHERE si.id = $1`,
      [result.rows[0].id]
    );

    return this.formatScheduleItem(full.rows[0]);
  }

  async updateScheduleItem(scheduleItemId: string, scheduledDate: string) {
    const result = await db.query(
      'UPDATE schedule_items SET scheduled_date = $1 WHERE id = $2 RETURNING id, project_id, task_id, scheduled_date, created_at',
      [scheduledDate, scheduleItemId]
    );

    if (result.rows.length === 0) return null;

    const full = await db.query(
      `SELECT si.id, si.project_id, si.task_id, si.scheduled_date, si.created_at,
              t.task_type, t.name, t.status, po.id as project_object_id, go.object_id
       FROM schedule_items si
       JOIN tasks t ON si.task_id = t.id
       LEFT JOIN project_objects po ON t.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       WHERE si.id = $1`,
      [scheduleItemId]
    );

    return this.formatScheduleItem(full.rows[0]);
  }

  async deleteScheduleItem(scheduleItemId: string) {
    const result = await db.query(
      'DELETE FROM schedule_items WHERE id = $1 RETURNING id',
      [scheduleItemId]
    );
    return result.rows.length > 0;
  }

  private formatScheduleItem(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      taskId: row.task_id,
      taskType: row.task_type,
      taskName: row.name,
      taskStatus: row.status,
      projectObjectId: row.project_object_id,
      objectId: row.object_id,
      scheduledDate: row.scheduled_date,
      createdAt: row.created_at,
    };
  }
}

export class AuditService {
  async getAuditLogs(filters?: { entityType?: string; entityId?: string; userId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) {
    let query = `
      SELECT al.id, al.user_id, al.entity_type, al.entity_id, al.action, al.before_data, al.after_data, al.created_at,
             u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.entityType) {
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(filters.entityType);
      paramCount++;
    }
    if (filters?.entityId) {
      query += ` AND al.entity_id = $${paramCount}`;
      params.push(filters.entityId);
      paramCount++;
    }
    if (filters?.userId) {
      query += ` AND al.user_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }
    if (filters?.startDate) {
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }
    if (filters?.endDate) {
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += ' ORDER BY al.created_at DESC';

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows.map(row => this.formatAuditLog(row));
  }

  async getAuditLogById(auditLogId: string) {
    const result = await db.query(
      `SELECT al.id, al.user_id, al.entity_type, al.entity_id, al.action, al.before_data, al.after_data, al.created_at,
              u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1`,
      [auditLogId]
    );
    if (result.rows.length === 0) return null;
    return this.formatAuditLog(result.rows[0]);
  }

  private formatAuditLog(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      beforeData: row.before_data,
      afterData: row.after_data,
      createdAt: row.created_at,
    };
  }
}

export default {
  dependency: new DependencyService(),
  schedule: new ScheduleService(),
  audit: new AuditService(),
};
