// server/src/services/projectService.ts
// Project database operations

import db from '../db.js';

export class ProjectService {
  async getProjectsByMockCycle(mockCycleId: string) {
    const result = await db.query(
      'SELECT id, mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at FROM projects WHERE mock_cycle_id = $1 ORDER BY start_date DESC',
      [mockCycleId]
    );
    return result.rows.map(row => this.formatProject(row));
  }

  async getProjectById(projectId: string) {
    const result = await db.query(
      'SELECT id, mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at FROM projects WHERE id = $1',
      [projectId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProject(result.rows[0]);
  }

  async createProject(mockCycleId: string, name: string, description: string | undefined, startDate: string, endDate: string, accentColor?: string, progressPercentage?: number) {
    const result = await db.query(
      'INSERT INTO projects (mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at',
      [mockCycleId, name, description || null, startDate, endDate, accentColor || null, progressPercentage || 0]
    );
    return this.formatProject(result.rows[0]);
  }

  async updateProject(projectId: string, data: { name?: string; description?: string; startDate?: string; endDate?: string; accentColor?: string; progressPercentage?: number; mockCycleId?: string }) {
    const fields: string[] = [];
    const values: any[] = [projectId];
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
    if (data.accentColor !== undefined) {
      fields.push(`accent_color = $${paramCount}`);
      values.push(data.accentColor || null);
      paramCount++;
    }
    if (data.progressPercentage !== undefined) {
      fields.push(`progress_percentage = $${paramCount}`);
      values.push(data.progressPercentage);
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
    if (data.mockCycleId !== undefined) {
      fields.push(`mock_cycle_id = $${paramCount}`);
      values.push(data.mockCycleId);
      paramCount++;
    }

    if (fields.length === 0) return this.getProjectById(projectId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $1 RETURNING id, mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatProject(result.rows[0]);
  }

  async deleteProject(projectId: string) {
    // Check for dependencies
    const objectCount = await db.query(
      'SELECT COUNT(*) FROM project_objects WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(objectCount.rows[0].count) > 0) {
      throw new Error('Cannot delete project with existing project objects');
    }

    const groupCount = await db.query(
      'SELECT COUNT(*) FROM task_groups WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(groupCount.rows[0].count) > 0) {
      throw new Error('Cannot delete project with existing task groups');
    }

    const taskCount = await db.query(
      'SELECT COUNT(*) FROM tasks WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(taskCount.rows[0].count) > 0) {
      throw new Error('Cannot delete project with existing tasks');
    }

    const result = await db.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [projectId]
    );

    return result.rows.length > 0;
  }

  async getProjectStats(projectId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT po.id) as object_count,
        COUNT(DISTINCT tg.id) as task_group_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END) as completed_tasks
      FROM projects p
      LEFT JOIN project_objects po ON p.id = po.project_id
      LEFT JOIN task_groups tg ON p.id = tg.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1`,
      [projectId]
    );

    return result.rows[0];
  }

  private formatProject(row: any) {
    return {
      id: row.id,
      mockCycleId: row.mock_cycle_id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      accentColor: row.accent_color,
      progressPercentage: row.progress_percentage || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProjectService();
