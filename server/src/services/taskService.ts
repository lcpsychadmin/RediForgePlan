// server/src/services/taskService.ts
// Task and task group database operations

import db from '../db.js';

interface TaskInput {
  projectObjectId?: string;
  taskGroupId?: string;
  taskType: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  duration?: number;
  durationUnit?: string;
  progressPercentage?: number;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

export class TaskService {
  // Timezone-safe date formatter: always returns YYYY-MM-DD string
  private fmtDate(d: any): string | null {
    if (!d) return null;
    if (typeof d === 'string') return d.substring(0, 10);
    // Date object from pg — use UTC to avoid timezone offset
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  async getTaskGroupsByProject(projectId: string) {
    const result = await db.query(
      'SELECT id, project_id, name, description, start_date, end_date, created_at, updated_at FROM task_groups WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows.map(row => this.formatTaskGroup(row));
  }

  async getTaskGroupById(taskGroupId: string) {
    const result = await db.query(
      'SELECT id, project_id, name, description, start_date, end_date, created_at, updated_at FROM task_groups WHERE id = $1',
      [taskGroupId]
    );
    if (result.rows.length === 0) return null;
    return this.formatTaskGroup(result.rows[0]);
  }

  async createTaskGroup(projectId: string, name: string, description: string | undefined, startDate: string | undefined, endDate: string | undefined) {
    const result = await db.query(
      'INSERT INTO task_groups (project_id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, project_id, name, description, start_date, end_date, created_at, updated_at',
      [projectId, name, description || null, startDate || null, endDate || null]
    );
    return this.formatTaskGroup(result.rows[0]);
  }

  async updateTaskGroup(taskGroupId: string, data: { name?: string; description?: string; startDate?: string; endDate?: string }) {
    const fields: string[] = [];
    const values: any[] = [taskGroupId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
      paramCount++;
    }
    if (data.startDate !== undefined) {
      fields.push(`start_date = $${paramCount}`);
      values.push(data.startDate);
      paramCount++;
    }
    if (data.endDate !== undefined) {
      fields.push(`end_date = $${paramCount}`);
      values.push(data.endDate);
      paramCount++;
    }

    if (fields.length === 0) return this.getTaskGroupById(taskGroupId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE task_groups SET ${fields.join(', ')} WHERE id = $1 RETURNING id, project_id, name, description, start_date, end_date, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatTaskGroup(result.rows[0]);
  }

  async deleteTaskGroup(taskGroupId: string) {
    // Delete all tasks in the group first, then the group
    await db.query('DELETE FROM tasks WHERE task_group_id = $1', [taskGroupId]);

    const result = await db.query(
      'DELETE FROM task_groups WHERE id = $1 RETURNING id',
      [taskGroupId]
    );

    return result.rows.length > 0;
  }

  async getTaskGroupStats(taskGroupId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END) as completed_tasks
      FROM task_groups tg
      LEFT JOIN tasks t ON tg.id = t.task_group_id
      WHERE tg.id = $1`,
      [taskGroupId]
    );

    return result.rows[0];
  }

  // Tasks
  async getTasksByProject(projectId: string, filters?: { status?: string; taskType?: string; draUserId?: string; developerUserId?: string; projectObjectId?: string; taskGroupId?: string }) {
    let query = `
      SELECT t.id, t.project_id, t.project_object_id, t.task_group_id, t.task_type, t.name, t.status,
             t.start_date, t.end_date, t.assigned_to, t.duration, t.duration_unit, t.progress_percentage,
             t.dra_user_id, t.developer_user_id, t.notes, t.created_at, t.updated_at
      FROM tasks t
      WHERE t.project_id = $1
    `;
    const params: any[] = [projectId];
    let paramCount = 2;

    if (filters?.status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    if (filters?.taskType) {
      query += ` AND t.task_type = $${paramCount}`;
      params.push(filters.taskType);
      paramCount++;
    }
    if (filters?.draUserId) {
      query += ` AND t.dra_user_id = $${paramCount}`;
      params.push(filters.draUserId);
      paramCount++;
    }
    if (filters?.developerUserId) {
      query += ` AND t.developer_user_id = $${paramCount}`;
      params.push(filters.developerUserId);
      paramCount++;
    }
    if (filters?.projectObjectId) {
      query += ` AND t.project_object_id = $${paramCount}`;
      params.push(filters.projectObjectId);
      paramCount++;
    }
    if (filters?.taskGroupId) {
      query += ` AND t.task_group_id = $${paramCount}`;
      params.push(filters.taskGroupId);
      paramCount++;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(row => this.formatTask(row));
  }

  async getTaskById(taskId: string) {
    const result = await db.query(
      `SELECT t.id, t.project_id, t.project_object_id, t.task_group_id, t.task_type, t.name, t.status,
              t.start_date, t.end_date, t.assigned_to, t.duration, t.duration_unit, t.progress_percentage,
              t.dra_user_id, t.developer_user_id, t.notes, t.created_at, t.updated_at
       FROM tasks t
       WHERE t.id = $1`,
      [taskId]
    );
    if (result.rows.length === 0) return null;
    return this.formatTask(result.rows[0]);
  }

  async createTask(projectId: string, data: TaskInput) {
    if (!data.projectObjectId && !data.taskGroupId) {
      throw new Error('Task must have either projectObjectId or taskGroupId');
    }

    const result = await db.query(
      `INSERT INTO tasks (
        project_id, project_object_id, task_group_id, task_type, name, status,
        start_date, end_date, assigned_to, duration, duration_unit, progress_percentage, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, project_id, project_object_id, task_group_id, task_type, name, status,
                 start_date, end_date, assigned_to, duration, duration_unit, progress_percentage,
                 dra_user_id, developer_user_id, notes, created_at, updated_at`,
      [
        projectId,
        data.projectObjectId || null,
        data.taskGroupId || null,
        data.taskType,
        data.name || null,
        data.status || 'not_started',
        data.startDate || null,
        data.endDate || null,
        data.assignedTo || null,
        data.duration || null,
        data.durationUnit || 'days',
        data.progressPercentage || 0,
        data.draUserId || null,
        data.developerUserId || null,
        data.notes || null,
      ]
    );

    return this.formatTask(result.rows[0]);
  }

  async updateTask(taskId: string, data: Partial<TaskInput>) {
    const fields: string[] = [];
    const values: any[] = [taskId];
    let paramCount = 2;

    const fieldMap: { [key: string]: string } = {
      status: 'status',
      name: 'name',
      startDate: 'start_date',
      endDate: 'end_date',
      assignedTo: 'assigned_to',
      duration: 'duration',
      durationUnit: 'duration_unit',
      progressPercentage: 'progress_percentage',
      draUserId: 'dra_user_id',
      developerUserId: 'developer_user_id',
      notes: 'notes',
    };

    for (const [key, dbColumn] of Object.entries(fieldMap)) {
      if (key in data && (data as any)[key] !== undefined) {
        fields.push(`${dbColumn} = $${paramCount}`);
        values.push((data as any)[key]);
        paramCount++;
      }
    }

    if (fields.length === 0) return this.getTaskById(taskId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING id`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.getTaskById(taskId);
  }

  async deleteTask(taskId: string) {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [taskId]
    );
    return result.rows.length > 0;
  }

  // Task dependencies
  async getTaskDependencies(taskId: string) {
    const result = await db.query(
      `SELECT td.id, td.task_id, td.depends_on_task_id,
              t.name AS depends_on_name, t.project_object_id, t.task_group_id,
              t.end_date, t.start_date,
              go.object_id AS object_id
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       LEFT JOIN project_objects po ON t.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       WHERE td.task_id = $1`,
      [taskId]
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      taskId: r.task_id,
      dependsOnTaskId: r.depends_on_task_id,
      dependsOnName: r.depends_on_name,
      objectId: r.object_id,
      endDate: this.fmtDate(r.end_date),
      startDate: this.fmtDate(r.start_date),
    }));
  }

  async addTaskDependency(taskId: string, dependsOnTaskId: string) {
    const result = await db.query(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [taskId, dependsOnTaskId]
    );
    return result.rows.length > 0;
  }

  async removeTaskDependency(taskId: string, dependsOnTaskId: string) {
    const result = await db.query(
      'DELETE FROM task_dependencies WHERE task_id = $1 AND depends_on_task_id = $2 RETURNING id',
      [taskId, dependsOnTaskId]
    );
    return result.rows.length > 0;
  }

  // Default task templates
  async getDefaultTaskTemplates() {
    const result = await db.query(
      'SELECT id, name, task_type, sort_order, duration, duration_unit, is_active FROM default_task_templates ORDER BY sort_order ASC'
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      taskType: r.task_type,
      sortOrder: r.sort_order,
      duration: r.duration,
      durationUnit: r.duration_unit,
      isActive: r.is_active,
    }));
  }

  async updateDefaultTaskTemplate(id: string, data: { name?: string; sortOrder?: number; duration?: number; durationUnit?: string; isActive?: boolean }) {
    const fields: string[] = [];
    const values: any[] = [id];
    let p = 2;
    if (data.name !== undefined) { fields.push(`name = $${p++}`); values.push(data.name); }
    if (data.sortOrder !== undefined) { fields.push(`sort_order = $${p++}`); values.push(data.sortOrder); }
    if (data.duration !== undefined) { fields.push(`duration = $${p++}`); values.push(data.duration); }
    if (data.durationUnit !== undefined) { fields.push(`duration_unit = $${p++}`); values.push(data.durationUnit); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${p++}`); values.push(data.isActive); }
    if (fields.length === 0) return null;
    fields.push('updated_at = CURRENT_TIMESTAMP');
    await db.query(`UPDATE default_task_templates SET ${fields.join(', ')} WHERE id = $1`, values);
    return this.getDefaultTaskTemplates();
  }

  async createDefaultTaskTemplate(data: { name: string; taskType?: string; sortOrder?: number; duration?: number; durationUnit?: string }) {
    const result = await db.query(
      `INSERT INTO default_task_templates (name, task_type, sort_order, duration, duration_unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [data.name, data.taskType || 'custom', data.sortOrder || 99, data.duration || 8, data.durationUnit || 'hours']
    );
    return result.rows[0];
  }

  async deleteDefaultTaskTemplate(id: string) {
    await db.query('DELETE FROM default_task_templates WHERE id = $1', [id]);
  }

  async createDefaultTasksForProjectObject(projectId: string, projectObjectId: string) {
    const templates = await this.getDefaultTaskTemplates();
    const active = templates.filter((t: any) => t.isActive);
    const created = [];
    for (const tpl of active) {
      const task = await this.createTask(projectId, {
        projectObjectId,
        taskType: tpl.taskType,
        name: tpl.name,
        status: 'not_started',
      });
      created.push(task);
    }
    // Auto-create sequential dependencies: each task depends on the previous one
    for (let i = 1; i < created.length; i++) {
      await this.addTaskDependency(created[i].id, created[i - 1].id);
    }
    return created;
  }

  private formatTaskGroup(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      startDate: this.fmtDate(row.start_date),
      endDate: this.fmtDate(row.end_date),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatTask(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      projectObjectId: row.project_object_id,
      taskGroupId: row.task_group_id,
      taskType: row.task_type,
      name: row.name,
      status: row.status,
      startDate: this.fmtDate(row.start_date),
      endDate: this.fmtDate(row.end_date),
      assignedTo: row.assigned_to,
      duration: row.duration,
      durationUnit: row.duration_unit,
      progressPercentage: row.progress_percentage ?? 0,
      draUserId: row.dra_user_id,
      developerUserId: row.developer_user_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new TaskService();
