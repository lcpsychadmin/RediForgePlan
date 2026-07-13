// server/src/services/taskService.ts
// Task and task group database operations

import db from '../db.js';
import automationService from '../automation/automation.service.js';

interface TaskInput {
  projectObjectId?: string;
  taskGroupId?: string;
  taskType: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  revisedStartDate?: string;
  revisedEndDate?: string;
  assignedTo?: string;
  duration?: number;
  durationUnit?: string;
  scheduleModeOverride?: string | null;
  progressPercentage?: number;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
}

interface TaskSubtaskInput {
  title: string;
  description?: string | null;
  status?: 'not_started' | 'in_progress' | 'blocked' | 'complete';
  assignedTo?: string | null;
}

interface TaskAttachmentInput {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  uploadedByUserId: string;
}

export class TaskService {
  private taskGroupProcessAreaSupported: boolean | null = null;
  private taskSubtasksTableReady: boolean | null = null;
  private taskAttachmentsTableReady: boolean | null = null;

  private async supportsTaskGroupProcessArea() {
    if (this.taskGroupProcessAreaSupported !== null) {
      return this.taskGroupProcessAreaSupported;
    }
    const result = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'task_groups' AND column_name = 'process_area'
       LIMIT 1`
    );
    this.taskGroupProcessAreaSupported = result.rows.length > 0;
    return this.taskGroupProcessAreaSupported;
  }

  private async ensureTaskSubtasksTable() {
    if (this.taskSubtasksTableReady) return;

    await db.query(
      `CREATE TABLE IF NOT EXISTS task_subtasks (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
         title TEXT NOT NULL,
         description TEXT,
         assigned_to TEXT,
         status VARCHAR(20) NOT NULL DEFAULT 'not_started'
           CHECK (status IN ('not_started', 'in_progress', 'blocked', 'complete')),
         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await db.query('ALTER TABLE task_subtasks ADD COLUMN IF NOT EXISTS assigned_to TEXT');

    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id)'
    );

    this.taskSubtasksTableReady = true;
  }

  private async ensureTaskAttachmentsTable() {
    if (this.taskAttachmentsTableReady) return;

    await db.query(
      `CREATE TABLE IF NOT EXISTS task_attachments (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
         file_name TEXT NOT NULL,
         mime_type TEXT,
         file_size INTEGER NOT NULL,
         file_data BYTEA NOT NULL,
         uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await db.query(
      'CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id)'
    );

    this.taskAttachmentsTableReady = true;
  }

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
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const result = await db.query(
      supportsProcessArea
        ? 'SELECT id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at FROM task_groups WHERE project_id = $1 ORDER BY created_at DESC'
        : 'SELECT id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, \'[]\') AS members, created_at, updated_at FROM task_groups WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows.map(row => this.formatTaskGroup(row));
  }

  async getTaskGroupById(taskGroupId: string) {
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const result = await db.query(
      supportsProcessArea
        ? 'SELECT id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at FROM task_groups WHERE id = $1'
        : 'SELECT id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, \'[]\') AS members, created_at, updated_at FROM task_groups WHERE id = $1',
      [taskGroupId]
    );
    if (result.rows.length === 0) return null;
    return this.formatTaskGroup(result.rows[0]);
  }

  async createTaskGroup(projectId: string, name: string, processArea: string | undefined, description: string | undefined, startDate: string | undefined, endDate: string | undefined) {
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const result = await db.query(
      supportsProcessArea
        ? 'INSERT INTO task_groups (project_id, name, process_area, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at'
        : 'INSERT INTO task_groups (project_id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, \'[]\') AS members, created_at, updated_at',
      supportsProcessArea
        ? [projectId, name, processArea || null, description || null, startDate || null, endDate || null]
        : [projectId, name, description || null, startDate || null, endDate || null]
    );
    return this.formatTaskGroup(result.rows[0]);
  }

  async updateTaskGroup(taskGroupId: string, data: { name?: string; processArea?: string; description?: string; startDate?: string; endDate?: string; members?: string[] }) {
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const fields: string[] = [];
    const values: any[] = [taskGroupId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (supportsProcessArea && data.processArea !== undefined) {
      fields.push(`process_area = $${paramCount}`);
      values.push(data.processArea || null);
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
    if (data.members !== undefined) {
      fields.push(`members = $${paramCount}`);
      values.push(JSON.stringify(data.members));
      paramCount++;
    }

    if (fields.length === 0) return this.getTaskGroupById(taskGroupId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      supportsProcessArea
        ? `UPDATE task_groups SET ${fields.join(', ')} WHERE id = $1 RETURNING id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at`
        : `UPDATE task_groups SET ${fields.join(', ')} WHERE id = $1 RETURNING id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, '[]') AS members, created_at, updated_at`,
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
      SELECT t.id, t.project_id, t.mock_cycle_id, t.project_object_id, t.task_group_id, t.task_type, t.name, t.status,
              t.start_date, t.end_date, t.revised_start_date, t.revised_end_date, t.actual_start_date, t.actual_end_date, t.assigned_to, t.duration, t.duration_unit, t.schedule_mode_override, t.progress_percentage,
             t.dra_user_id, t.developer_user_id, t.notes, t.created_at, t.updated_at,
             go.object_id,
             COALESCE(go.process_area, tg.process_area) AS process_area
      FROM tasks t
      LEFT JOIN project_objects po ON t.project_object_id = po.id
      LEFT JOIN global_objects go ON po.global_object_id = go.id
      LEFT JOIN task_groups tg ON t.task_group_id = tg.id
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
      `SELECT t.id, t.project_id, t.mock_cycle_id, t.project_object_id, t.task_group_id, t.task_type, t.name, t.status,
              t.start_date, t.end_date, t.revised_start_date, t.revised_end_date, t.actual_start_date, t.actual_end_date, t.assigned_to, t.duration, t.duration_unit, t.schedule_mode_override, t.progress_percentage,
              t.dra_user_id, t.developer_user_id, t.notes, t.created_at, t.updated_at,
              go.object_id,
              COALESCE(go.process_area, tg.process_area) AS process_area
       FROM tasks t
       LEFT JOIN project_objects po ON t.project_object_id = po.id
       LEFT JOIN global_objects go ON po.global_object_id = go.id
       LEFT JOIN task_groups tg ON t.task_group_id = tg.id
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
        start_date, end_date, revised_start_date, revised_end_date,
        assigned_to, duration, duration_unit, schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, project_id, mock_cycle_id, project_object_id, task_group_id, task_type, name, status,
                 start_date, end_date, revised_start_date, revised_end_date,
                 assigned_to, duration, duration_unit, schedule_mode_override, progress_percentage,
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
        data.revisedStartDate || null,
        data.revisedEndDate || null,
        data.assignedTo || null,
        data.duration || null,
        data.durationUnit || 'days',
        data.scheduleModeOverride || null,
        data.progressPercentage || 0,
        data.draUserId || null,
        data.developerUserId || null,
        data.notes || null,
      ]
    );

    return this.formatTask(result.rows[0]);
  }

  async updateTask(taskId: string, data: Partial<TaskInput>) {
    const previousTask = await this.getTaskById(taskId);

    const fields: string[] = [];
    const values: any[] = [taskId];
    let paramCount = 2;

    // Auto-set actual dates based on status transitions (only if not already set
    // and the caller hasn't explicitly provided them).
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (data.status === 'in_progress' && previousTask?.status !== 'in_progress') {
      if (!previousTask?.actualStartDate && !('actualStartDate' in data)) {
        (data as any).actualStartDate = today;
      }
    }
    if (data.status === 'complete' && previousTask?.status !== 'complete') {
      if (!previousTask?.actualEndDate && !('actualEndDate' in data)) {
        (data as any).actualEndDate = today;
      }
    }
    // If being moved back from complete, clear actual end date (unless caller set it)
    if (data.status && data.status !== 'complete' && previousTask?.status === 'complete') {
      if (!('actualEndDate' in data)) {
        (data as any).actualEndDate = null;
      }
    }

    const fieldMap: { [key: string]: string } = {
      status: 'status',
      name: 'name',
      startDate: 'start_date',
      endDate: 'end_date',
      revisedStartDate: 'revised_start_date',
      revisedEndDate: 'revised_end_date',
      actualStartDate: 'actual_start_date',
      actualEndDate: 'actual_end_date',
      assignedTo: 'assigned_to',
      duration: 'duration',
      durationUnit: 'duration_unit',
      scheduleModeOverride: 'schedule_mode_override',
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
    const updatedTask = await this.getTaskById(taskId);

    try {
      if (
        updatedTask &&
        previousTask &&
        updatedTask.status !== previousTask.status
      ) {
        await automationService.evaluateTaskStatus(taskId, updatedTask.status);
      }
    } catch (error) {
      console.error('[automation] evaluateTaskStatus failed', {
        taskId,
        previousStatus: previousTask?.status,
        newStatus: updatedTask?.status,
        error,
      });
    }

    return updatedTask;
  }

  async deleteTask(taskId: string) {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [taskId]
    );
    return result.rows.length > 0;
  }

  // Task attachments
  async getTaskAttachments(taskId: string) {
    await this.ensureTaskAttachmentsTable();
    const result = await db.query(
      `SELECT ta.id, ta.task_id, ta.file_name, ta.mime_type, ta.file_size,
              ta.uploaded_by_user_id, ta.created_at, u.email AS uploaded_by_user_email
       FROM task_attachments ta
       LEFT JOIN users u ON ta.uploaded_by_user_id = u.id
       WHERE ta.task_id = $1
       ORDER BY ta.created_at DESC`,
      [taskId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      taskId: row.task_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedByUserId: row.uploaded_by_user_id,
      uploadedByUserEmail: row.uploaded_by_user_email,
      createdAt: row.created_at,
    }));
  }

  async addTaskAttachment(taskId: string, input: TaskAttachmentInput) {
    await this.ensureTaskAttachmentsTable();
    const fileBuffer = Buffer.from(input.dataBase64, 'base64');
    if (!fileBuffer.length) {
      throw new Error('Attachment payload is empty');
    }

    const result = await db.query(
      `INSERT INTO task_attachments (
         task_id, file_name, mime_type, file_size, file_data, uploaded_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, task_id, file_name, mime_type, file_size, uploaded_by_user_id, created_at`,
      [
        taskId,
        input.fileName,
        input.mimeType,
        fileBuffer.length,
        fileBuffer,
        input.uploadedByUserId,
      ]
    );

    return {
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      fileName: result.rows[0].file_name,
      mimeType: result.rows[0].mime_type,
      fileSize: result.rows[0].file_size,
      uploadedByUserId: result.rows[0].uploaded_by_user_id,
      createdAt: result.rows[0].created_at,
    };
  }

  async getTaskAttachmentById(attachmentId: string) {
    await this.ensureTaskAttachmentsTable();
    const result = await db.query(
      `SELECT id, task_id, file_name, mime_type, file_size, file_data, uploaded_by_user_id, created_at
       FROM task_attachments
       WHERE id = $1`,
      [attachmentId]
    );

    if (result.rows.length === 0) return null;

    return {
      id: result.rows[0].id,
      taskId: result.rows[0].task_id,
      fileName: result.rows[0].file_name,
      mimeType: result.rows[0].mime_type,
      fileSize: result.rows[0].file_size,
      fileData: result.rows[0].file_data,
      uploadedByUserId: result.rows[0].uploaded_by_user_id,
      createdAt: result.rows[0].created_at,
    };
  }

  async deleteTaskAttachment(attachmentId: string) {
    await this.ensureTaskAttachmentsTable();
    const result = await db.query(
      'DELETE FROM task_attachments WHERE id = $1 RETURNING id',
      [attachmentId]
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

  // Task subtasks
  async getTaskSubtasks(taskId: string) {
    await this.ensureTaskSubtasksTable();
    const result = await db.query(
      `SELECT id, task_id, title, description, assigned_to, status, created_at, updated_at
       FROM task_subtasks
       WHERE task_id = $1
       ORDER BY created_at ASC`,
      [taskId]
    );
    return result.rows.map((row: any) => this.formatTaskSubtask(row));
  }

  async createTaskSubtask(taskId: string, data: TaskSubtaskInput) {
    await this.ensureTaskSubtasksTable();
    const result = await db.query(
      `INSERT INTO task_subtasks (task_id, title, description, assigned_to, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, task_id, title, description, assigned_to, status, created_at, updated_at`,
      [
        taskId,
        data.title,
        data.description || null,
        data.assignedTo || null,
        data.status || 'not_started',
      ]
    );
    return this.formatTaskSubtask(result.rows[0]);
  }

  async updateTaskSubtask(subtaskId: string, data: Partial<TaskSubtaskInput>) {
    await this.ensureTaskSubtasksTable();
    const fields: string[] = [];
    const values: any[] = [subtaskId];
    let paramCount = 2;

    if (data.title !== undefined) {
      fields.push(`title = $${paramCount}`);
      values.push(data.title);
      paramCount++;
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description || null);
      paramCount++;
    }
    if (data.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount}`);
      values.push(data.assignedTo || null);
      paramCount++;
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    if (fields.length === 0) {
      const current = await db.query(
        `SELECT id, task_id, title, description, assigned_to, status, created_at, updated_at
         FROM task_subtasks
         WHERE id = $1`,
        [subtaskId]
      );
      return current.rows.length > 0 ? this.formatTaskSubtask(current.rows[0]) : null;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE task_subtasks
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id, task_id, title, description, assigned_to, status, created_at, updated_at`,
      values
    );
    return result.rows.length > 0 ? this.formatTaskSubtask(result.rows[0]) : null;
  }

  async deleteTaskSubtask(subtaskId: string) {
    await this.ensureTaskSubtasksTable();
    const result = await db.query(
      'DELETE FROM task_subtasks WHERE id = $1 RETURNING id',
      [subtaskId]
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
    return created;
  }

  // ── Cycle-scoped helpers ────────────────────────────────────────────────────

  /** Look up the project_id for a mock cycle (needed to satisfy the NOT NULL FK). */
  private async getProjectIdForCycle(mockCycleId: string): Promise<string> {
    const result = await db.query(
      'SELECT project_id FROM mock_cycles WHERE id = $1',
      [mockCycleId]
    );
    if (result.rows.length === 0) throw new Error(`Mock cycle ${mockCycleId} not found`);
    return result.rows[0].project_id as string;
  }

  async getTaskGroupsByCycle(mockCycleId: string) {
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const result = await db.query(
      supportsProcessArea
        ? 'SELECT id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at FROM task_groups WHERE mock_cycle_id = $1 ORDER BY created_at ASC'
        : 'SELECT id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, \'[]\') AS members, created_at, updated_at FROM task_groups WHERE mock_cycle_id = $1 ORDER BY created_at ASC',
      [mockCycleId]
    );
    return result.rows.map(row => this.formatTaskGroup(row));
  }

  async createTaskGroupForCycle(mockCycleId: string, name: string, processArea: string | undefined, description: string | undefined, startDate: string | undefined, endDate: string | undefined) {
    const projectId = await this.getProjectIdForCycle(mockCycleId);
    const supportsProcessArea = await this.supportsTaskGroupProcessArea();
    const result = await db.query(
      supportsProcessArea
        ? 'INSERT INTO task_groups (project_id, mock_cycle_id, name, process_area, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, project_id, name, process_area, description, start_date, end_date, members, created_at, updated_at'
        : 'INSERT INTO task_groups (project_id, mock_cycle_id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date, COALESCE(members, \'[]\') AS members, created_at, updated_at',
      supportsProcessArea
        ? [projectId, mockCycleId, name, processArea || null, description || null, startDate || null, endDate || null]
        : [projectId, mockCycleId, name, description || null, startDate || null, endDate || null]
    );
    return this.formatTaskGroup(result.rows[0]);
  }

  async getTasksByCycle(mockCycleId: string, filters?: { status?: string; taskType?: string; draUserId?: string; developerUserId?: string; projectObjectId?: string; taskGroupId?: string }) {
    let query = `
      SELECT t.id, t.project_id, t.mock_cycle_id, t.project_object_id, t.task_group_id, t.task_type, t.name, t.status,
             t.start_date, t.end_date, t.revised_start_date, t.revised_end_date, t.actual_start_date, t.actual_end_date, t.assigned_to, t.duration, t.duration_unit, t.schedule_mode_override, t.progress_percentage,
             t.dra_user_id, t.developer_user_id, t.notes, t.created_at, t.updated_at,
             go.object_id,
             COALESCE(go.process_area, tg.process_area) AS process_area
      FROM tasks t
      LEFT JOIN project_objects po ON t.project_object_id = po.id
      LEFT JOIN global_objects go ON po.global_object_id = go.id
      LEFT JOIN task_groups tg ON t.task_group_id = tg.id
      WHERE t.mock_cycle_id = $1
    `;
    const params: any[] = [mockCycleId];
    let paramCount = 2;

    if (filters?.status) { query += ` AND t.status = $${paramCount}`; params.push(filters.status); paramCount++; }
    if (filters?.taskType) { query += ` AND t.task_type = $${paramCount}`; params.push(filters.taskType); paramCount++; }
    if (filters?.draUserId) { query += ` AND t.dra_user_id = $${paramCount}`; params.push(filters.draUserId); paramCount++; }
    if (filters?.developerUserId) { query += ` AND t.developer_user_id = $${paramCount}`; params.push(filters.developerUserId); paramCount++; }
    if (filters?.projectObjectId) { query += ` AND t.project_object_id = $${paramCount}`; params.push(filters.projectObjectId); paramCount++; }
    if (filters?.taskGroupId) { query += ` AND t.task_group_id = $${paramCount}`; params.push(filters.taskGroupId); paramCount++; }

    query += ' ORDER BY t.created_at DESC';
    const result = await db.query(query, params);
    return result.rows.map(row => this.formatTask(row));
  }

  async createTaskForCycle(mockCycleId: string, data: TaskInput) {
    if (!data.projectObjectId && !data.taskGroupId) {
      throw new Error('Task must have either projectObjectId or taskGroupId');
    }
    const projectId = await this.getProjectIdForCycle(mockCycleId);
    const result = await db.query(
      `INSERT INTO tasks (
        project_id, mock_cycle_id, project_object_id, task_group_id, task_type, name, status,
        start_date, end_date, revised_start_date, revised_end_date,
        assigned_to, duration, duration_unit, schedule_mode_override,
        progress_percentage, dra_user_id, developer_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING id, project_id, mock_cycle_id, project_object_id, task_group_id, task_type, name, status,
                 start_date, end_date, revised_start_date, revised_end_date,
                 assigned_to, duration, duration_unit, schedule_mode_override,
                 progress_percentage, dra_user_id, developer_user_id, notes, created_at, updated_at`,
      [
        projectId, mockCycleId,
        data.projectObjectId || null, data.taskGroupId || null,
        data.taskType, data.name || null,
        data.status || 'not_started',
        data.startDate || null, data.endDate || null,
        data.revisedStartDate || null, data.revisedEndDate || null,
        data.assignedTo || null, data.duration || null,
        data.durationUnit || 'days', data.scheduleModeOverride || null,
        data.progressPercentage || 0,
        data.draUserId || null, data.developerUserId || null, data.notes || null,
      ]
    );
    return this.formatTask(result.rows[0]);
  }

  async createDefaultTasksForCycle(mockCycleId: string, projectObjectId: string) {
    const templates = await this.getDefaultTaskTemplates();
    const active = templates.filter((t: any) => t.isActive);
    const created = [];
    for (const tpl of active) {
      const task = await this.createTaskForCycle(mockCycleId, {
        projectObjectId,
        taskType: tpl.taskType,
        name: tpl.name,
        status: 'not_started',
      });
      created.push(task);
    }
    return created;
  }

  private formatTaskGroup(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      processArea: row.process_area || '',
      description: row.description,
      startDate: this.fmtDate(row.start_date),
      endDate: this.fmtDate(row.end_date),
      members: Array.isArray(row.members) ? row.members : (row.members ? JSON.parse(row.members) : []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatTask(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      mockCycleId: row.mock_cycle_id || null,
      projectObjectId: row.project_object_id,
      objectId: row.object_id,
      processArea: row.process_area || '',
      taskGroupId: row.task_group_id,
      taskType: row.task_type,
      name: row.name,
      status: row.status,
      startDate: this.fmtDate(row.start_date),
      endDate: this.fmtDate(row.end_date),
      revisedStartDate: this.fmtDate(row.revised_start_date),
      revisedEndDate: this.fmtDate(row.revised_end_date),
      actualStartDate: this.fmtDate(row.actual_start_date),
      actualEndDate: this.fmtDate(row.actual_end_date),
      assignedTo: row.assigned_to,
      duration: row.duration,
      durationUnit: row.duration_unit,
      scheduleModeOverride: row.schedule_mode_override,
      progressPercentage: row.progress_percentage ?? 0,
      draUserId: row.dra_user_id,
      developerUserId: row.developer_user_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatTaskSubtask(row: any) {
    return {
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      description: row.description,
      assignedTo: row.assigned_to,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new TaskService();
