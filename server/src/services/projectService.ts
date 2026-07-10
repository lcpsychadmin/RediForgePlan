// server/src/services/projectService.ts
// Project database operations

import db from '../db.js';

export class ProjectService {
  private workflowRoleTableReady: boolean | null = null;

  private async ensureProjectWorkflowRoleTable() {
    if (this.workflowRoleTableReady) return;

    await db.query(
      `CREATE TABLE IF NOT EXISTS project_workflow_role_assignments (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
         role_key VARCHAR(64) NOT NULL CHECK (role_key IN ('lead', 'project_manager')),
         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT project_workflow_role_assignments_unique UNIQUE (project_id, role_key)
       )`
    );

    await db.query('CREATE INDEX IF NOT EXISTS idx_pwra_project_id ON project_workflow_role_assignments(project_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_pwra_user_id ON project_workflow_role_assignments(user_id)');

    this.workflowRoleTableReady = true;
  }

  async getProjectWorkflowRoles(projectId: string) {
    await this.ensureProjectWorkflowRoleTable();
    const result = await db.query(
      `SELECT role_key, user_id
       FROM project_workflow_role_assignments
       WHERE project_id = $1`,
      [projectId]
    );

    const payload: { leadUserId: string | null; projectManagerUserId: string | null } = {
      leadUserId: null,
      projectManagerUserId: null,
    };

    for (const row of result.rows) {
      if (row.role_key === 'lead') payload.leadUserId = row.user_id;
      if (row.role_key === 'project_manager') payload.projectManagerUserId = row.user_id;
    }

    return payload;
  }

  async saveProjectWorkflowRoles(
    projectId: string,
    data: { leadUserId?: string | null; projectManagerUserId?: string | null }
  ) {
    await this.ensureProjectWorkflowRoleTable();
    await db.query('BEGIN');
    try {
      if (data.leadUserId !== undefined) {
        if (data.leadUserId) {
          await db.query(
            `INSERT INTO project_workflow_role_assignments (project_id, role_key, user_id)
             VALUES ($1, 'lead', $2)
             ON CONFLICT (project_id, role_key)
             DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = CURRENT_TIMESTAMP`,
            [projectId, data.leadUserId]
          );
        } else {
          await db.query(
            `DELETE FROM project_workflow_role_assignments
             WHERE project_id = $1
               AND role_key = 'lead'`,
            [projectId]
          );
        }
      }

      if (data.projectManagerUserId !== undefined) {
        if (data.projectManagerUserId) {
          await db.query(
            `INSERT INTO project_workflow_role_assignments (project_id, role_key, user_id)
             VALUES ($1, 'project_manager', $2)
             ON CONFLICT (project_id, role_key)
             DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = CURRENT_TIMESTAMP`,
            [projectId, data.projectManagerUserId]
          );
        } else {
          await db.query(
            `DELETE FROM project_workflow_role_assignments
             WHERE project_id = $1
               AND role_key = 'project_manager'`,
            [projectId]
          );
        }
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return this.getProjectWorkflowRoles(projectId);
  }

  async getProjectsByProgram(programId: string) {
    const result = await db.query(
      `SELECT p.id,
              p.program_id,
              mc_primary.id AS mock_cycle_id,
              p.name,
              p.description,
              p.start_date,
              p.end_date,
              p.accent_color,
              p.progress_percentage,
              p.created_at,
              p.updated_at
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT id
         FROM mock_cycles
         WHERE project_id = p.id
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1
       ) mc_primary ON true
       WHERE p.program_id = $1
       ORDER BY p.start_date DESC`,
      [programId]
    );
    return result.rows.map((row) => this.formatProject(row));
  }

  async getProjectsByMockCycle(mockCycleId: string) {
    const result = await db.query(
      `SELECT p.id,
              p.program_id,
              mc.id AS mock_cycle_id,
              p.name,
              p.description,
              p.start_date,
              p.end_date,
              p.accent_color,
              p.progress_percentage,
              p.created_at,
              p.updated_at
       FROM projects p
       JOIN mock_cycles mc ON mc.project_id = p.id
       WHERE mc.id = $1
       ORDER BY p.start_date DESC`,
      [mockCycleId]
    );
    return result.rows.map((row) => this.formatProject(row));
  }

  async getProjectById(projectId: string) {
    const result = await db.query(
      `SELECT p.id,
              p.program_id,
              mc_primary.id AS mock_cycle_id,
              p.name,
              p.description,
              p.start_date,
              p.end_date,
              p.accent_color,
              p.progress_percentage,
              p.created_at,
              p.updated_at
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT id
         FROM mock_cycles
         WHERE project_id = p.id
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1
       ) mc_primary ON true
       WHERE p.id = $1`,
      [projectId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProject(result.rows[0]);
  }

  async createProject(
    programId: string,
    name: string,
    description: string | undefined,
    startDate: string,
    endDate: string,
    accentColor?: string,
    progressPercentage?: number
  ) {
    const result = await db.query(
      `INSERT INTO projects (program_id, name, description, start_date, end_date, accent_color, progress_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, program_id, NULL::uuid AS mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at`,
      [programId, name, description || null, startDate, endDate, accentColor || null, progressPercentage || 0]
    );
    return this.formatProject(result.rows[0]);
  }

  async updateProject(
    projectId: string,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      accentColor?: string;
      progressPercentage?: number;
      programId?: string;
    }
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

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
    if (data.programId !== undefined) {
      fields.push(`program_id = $${paramCount}`);
      values.push(data.programId);
      paramCount++;
    }

    if (fields.length === 0) return this.getProjectById(projectId);

    const fieldAssignments = [...fields, 'updated_at = CURRENT_TIMESTAMP'];
    const result = await db.query(
      `UPDATE projects
       SET ${fieldAssignments.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, program_id, NULL::uuid AS mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage, created_at, updated_at`,
      [...values, projectId]
    );

    if (result.rows.length === 0) return null;

    return this.getProjectById(projectId);
  }

  async deleteProject(projectId: string) {
    const cycleCount = await db.query(
      'SELECT COUNT(*) FROM mock_cycles WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(cycleCount.rows[0].count, 10) > 0) {
      throw new Error('Cannot delete project with existing mock cycles');
    }

    const objectCount = await db.query(
      'SELECT COUNT(*) FROM project_objects WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(objectCount.rows[0].count, 10) > 0) {
      throw new Error('Cannot delete project with existing project objects');
    }

    const groupCount = await db.query(
      'SELECT COUNT(*) FROM task_groups WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(groupCount.rows[0].count, 10) > 0) {
      throw new Error('Cannot delete project with existing task groups');
    }

    const taskCount = await db.query(
      'SELECT COUNT(*) FROM tasks WHERE project_id = $1',
      [projectId]
    );

    if (parseInt(taskCount.rows[0].count, 10) > 0) {
      throw new Error('Cannot delete project with existing tasks');
    }

    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [projectId]);

    return result.rows.length > 0;
  }

  async getProjectStats(projectId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT po.id) as object_count,
        COUNT(DISTINCT tg.id) as task_group_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT mc.id) as mock_cycle_count,
        COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END) as completed_tasks
      FROM projects p
      LEFT JOIN project_objects po ON p.id = po.project_id
      LEFT JOIN task_groups tg ON p.id = tg.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN mock_cycles mc ON p.id = mc.project_id
      WHERE p.id = $1`,
      [projectId]
    );

    return result.rows[0];
  }

  private formatProject(row: any) {
    return {
      id: row.id,
      programId: row.program_id,
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
