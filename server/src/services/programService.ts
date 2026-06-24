// server/src/services/programService.ts
// Program and mock cycle database operations

import db from '../db.js';

export class ProgramService {
  // Programs
  async getAllPrograms() {
    const result = await db.query(
      'SELECT id, name, description, accent_color, created_at, updated_at FROM programs ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.formatProgram(row));
  }

  async getProgramById(programId: string) {
    const result = await db.query(
      'SELECT id, name, description, accent_color, created_at, updated_at FROM programs WHERE id = $1',
      [programId]
    );
    if (result.rows.length === 0) return null;
    return this.formatProgram(result.rows[0]);
  }

  async createProgram(name: string, description?: string, accentColor?: string) {
    const result = await db.query(
      'INSERT INTO programs (name, description, accent_color) VALUES ($1, $2, $3) RETURNING id, name, description, accent_color, created_at, updated_at',
      [name, description || null, accentColor || null]
    );
    return this.formatProgram(result.rows[0]);
  }

  async updateProgram(programId: string, data: { name?: string; description?: string; accentColor?: string }) {
    const fields: string[] = [];
    const values: any[] = [programId];
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

    if (fields.length === 0) return this.getProgramById(programId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE programs SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, description, accent_color, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatProgram(result.rows[0]);
  }

  async deleteProgram(programId: string) {
    // Cascade delete: first get all mock cycles for this program
    const cyclesResult = await db.query(
      'SELECT id FROM mock_cycles WHERE program_id = $1',
      [programId]
    );

    // Delete all projects in those mock cycles
    const cycleIds = cyclesResult.rows.map(r => r.id);
    if (cycleIds.length > 0) {
      await db.query(
        'DELETE FROM projects WHERE mock_cycle_id = ANY($1)',
        [cycleIds]
      );
    }

    // Delete all mock cycles for this program
    await db.query(
      'DELETE FROM mock_cycles WHERE program_id = $1',
      [programId]
    );

    // Finally delete the program
    const result = await db.query(
      'DELETE FROM programs WHERE id = $1 RETURNING id',
      [programId]
    );

    return result.rows.length > 0;
  }

  async getProgramStats(programId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT mc.id) as mock_cycle_count,
        COUNT(DISTINCT p.id) as project_count
      FROM programs pr
      LEFT JOIN mock_cycles mc ON pr.id = mc.program_id
      LEFT JOIN projects p ON mc.id = p.mock_cycle_id
      WHERE pr.id = $1`,
      [programId]
    );

    return result.rows[0];
  }

  // Mock Cycles
  async getMockCyclesByProgram(programId: string) {
    const result = await db.query(
      'SELECT id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at FROM mock_cycles WHERE program_id = $1 ORDER BY start_date DESC',
      [programId]
    );
    return result.rows.map(row => this.formatMockCycle(row));
  }

  async getMockCycleById(mockCycleId: string) {
    const result = await db.query(
      'SELECT id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at FROM mock_cycles WHERE id = $1',
      [mockCycleId]
    );
    if (result.rows.length === 0) return null;
    return this.formatMockCycle(result.rows[0]);
  }

  async createMockCycle(programId: string, name: string, startDate: string, endDate: string, scheduleMode: string = 'all_days', accentColor?: string) {
    const result = await db.query(
      'INSERT INTO mock_cycles (program_id, name, start_date, end_date, schedule_mode, accent_color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at',
      [programId, name, startDate, endDate, scheduleMode, accentColor || null]
    );
    return this.formatMockCycle(result.rows[0]);
  }

  async updateMockCycle(mockCycleId: string, data: { name?: string; startDate?: string; endDate?: string; scheduleMode?: string; accentColor?: string }) {
    const fields: string[] = [];
    const values: any[] = [mockCycleId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
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
    if (data.scheduleMode !== undefined) {
      fields.push(`schedule_mode = $${paramCount}`);
      values.push(data.scheduleMode);
      paramCount++;
    }
    if (data.accentColor !== undefined) {
      fields.push(`accent_color = $${paramCount}`);
      values.push(data.accentColor || null);
      paramCount++;
    }

    if (fields.length === 0) return this.getMockCycleById(mockCycleId);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE mock_cycles SET ${fields.join(', ')} WHERE id = $1 RETURNING id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatMockCycle(result.rows[0]);
  }

  async deleteMockCycle(mockCycleId: string) {
    const client = await db.connect();
    try {
      console.log(`[deleteMockCycle] Starting delete for cycle: ${mockCycleId}`);
      await client.query('BEGIN');
      console.log(`[deleteMockCycle] Transaction started`);

      const sourceCycleResult = await client.query(
        `SELECT id, program_id, name, start_date, end_date, schedule_mode, accent_color
         FROM mock_cycles
         WHERE id = $1
         FOR UPDATE`,
        [mockCycleId]
      );
      console.log(`[deleteMockCycle] Cycle lookup completed: ${sourceCycleResult.rowCount} rows`);

      if (sourceCycleResult.rows.length === 0) {
        console.log(`[deleteMockCycle] Cycle not found: ${mockCycleId}`);
        await client.query('ROLLBACK');
        return false;
      }

      const sourceCycle = sourceCycleResult.rows[0];
      console.log(`[deleteMockCycle] Found cycle: ${sourceCycle.name} (program: ${sourceCycle.program_id})`);

      console.log(`[deleteMockCycle] About to delete mock cycle: ${mockCycleId}`);
      const deleteResult = await client.query(
        'DELETE FROM mock_cycles WHERE id = $1 RETURNING id',
        [mockCycleId]
      );

      console.log(`[deleteMockCycle] Delete query returned ${deleteResult.rowCount} rows`);
      if (deleteResult.rows.length > 0) {
        console.log(`[deleteMockCycle] Successfully deleted cycle: ${deleteResult.rows[0].id}`);
      } else {
        console.log(`[deleteMockCycle] Delete returned no rows`);
      }

      console.log(`[deleteMockCycle] About to commit transaction`);
      await client.query('COMMIT');
      console.log(`[deleteMockCycle] Transaction committed successfully`);
      return deleteResult.rows.length > 0;
    } catch (error) {
      console.error(`[deleteMockCycle] ERROR occurred, rolling back:`, error instanceof Error ? error.message : String(error));
      try {
        await client.query('ROLLBACK');
        console.log(`[deleteMockCycle] Rollback completed`);
      } catch (rollbackError) {
        console.error(`[deleteMockCycle] Rollback failed:`, rollbackError);
      }
      throw error;
    } finally {
      client.release();
      console.log(`[deleteMockCycle] Client released`);
    }
  }

  async cloneMockCycle(sourceMockCycleId: string, data?: { name?: string }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const sourceCycleResult = await client.query(
        'SELECT id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at FROM mock_cycles WHERE id = $1',
        [sourceMockCycleId]
      );
      if (sourceCycleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const sourceCycle = sourceCycleResult.rows[0];
      const newCycleName = (data?.name || `${sourceCycle.name} Copy`).trim();

      const newCycleResult = await client.query(
        `INSERT INTO mock_cycles (program_id, name, start_date, end_date, schedule_mode, accent_color)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, program_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at`,
        [sourceCycle.program_id, newCycleName, sourceCycle.start_date, sourceCycle.end_date, sourceCycle.schedule_mode || 'all_days', sourceCycle.accent_color || null]
      );
      const newCycle = newCycleResult.rows[0];

      const projectsResult = await client.query(
        `SELECT id, name, description, start_date, end_date, accent_color, progress_percentage
         FROM projects
         WHERE mock_cycle_id = $1
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [sourceMockCycleId]
      );

      const projectIdMap = new Map<string, string>();
      for (const p of projectsResult.rows) {
        const insertedProject = await client.query(
          `INSERT INTO projects (mock_cycle_id, name, description, start_date, end_date, accent_color, progress_percentage)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [newCycle.id, p.name, p.description, p.start_date, p.end_date, p.accent_color, p.progress_percentage || 0]
        );
        projectIdMap.set(p.id, insertedProject.rows[0].id);
      }

      const sourceProjectIds = Array.from(projectIdMap.keys());
      const newProjectIds = Array.from(projectIdMap.values());

      const projectObjectIdMap = new Map<string, string>();
      const taskGroupIdMap = new Map<string, string>();
      const taskIdMap = new Map<string, string>();

      if (sourceProjectIds.length > 0) {
        const projectObjectsResult = await client.query(
          `SELECT id, project_id, global_object_id, complexity, deployment_disposition, build_type,
                  object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
                  factor_type, load_method, start_date, end_date, status, dra_user_id,
                  developer_user_id, notes
           FROM project_objects
           WHERE project_id = ANY($1)`,
          [sourceProjectIds]
        );

        for (const po of projectObjectsResult.rows) {
          const newProjectId = projectIdMap.get(po.project_id);
          if (!newProjectId) continue;
          const inserted = await client.query(
            `INSERT INTO project_objects (
              project_id, global_object_id, complexity, deployment_disposition, build_type,
              object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
              factor_type, load_method, start_date, end_date, status, dra_user_id,
              developer_user_id, notes
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16,
              $17, $18
            ) RETURNING id`,
            [
              newProjectId,
              po.global_object_id,
              po.complexity,
              po.deployment_disposition,
              po.build_type,
              po.object_type,
              po.cutover_phase,
              po.ddm_approach,
              po.risk_security_type,
              po.migration_type,
              po.factor_type,
              po.load_method,
              po.start_date,
              po.end_date,
              po.status,
              po.dra_user_id,
              po.developer_user_id,
              po.notes,
            ]
          );
          projectObjectIdMap.set(po.id, inserted.rows[0].id);
        }

        const sourceProjectObjectIds = Array.from(projectObjectIdMap.keys());
        if (sourceProjectObjectIds.length > 0) {
          const objectDepsResult = await client.query(
            `SELECT project_object_id, depends_on_project_object_id
             FROM object_dependencies
             WHERE project_object_id = ANY($1)
               AND depends_on_project_object_id = ANY($1)`,
            [sourceProjectObjectIds]
          );

          for (const dep of objectDepsResult.rows) {
            const newObjectId = projectObjectIdMap.get(dep.project_object_id);
            const newDependsOnId = projectObjectIdMap.get(dep.depends_on_project_object_id);
            if (!newObjectId || !newDependsOnId) continue;

            await client.query(
              `INSERT INTO object_dependencies (project_object_id, depends_on_project_object_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [newObjectId, newDependsOnId]
            );
          }
        }

        let taskGroupsResult;
        let supportsTaskGroupProcessArea = true;
        try {
          taskGroupsResult = await client.query(
            `SELECT id, project_id, name, process_area, description, start_date, end_date
             FROM task_groups
             WHERE project_id = ANY($1)`,
            [sourceProjectIds]
          );
        } catch {
          supportsTaskGroupProcessArea = false;
          taskGroupsResult = await client.query(
            `SELECT id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date
             FROM task_groups
             WHERE project_id = ANY($1)`,
            [sourceProjectIds]
          );
        }

        for (const tg of taskGroupsResult.rows) {
          const newProjectId = projectIdMap.get(tg.project_id);
          if (!newProjectId) continue;
          const inserted = await client.query(
            supportsTaskGroupProcessArea
              ? `INSERT INTO task_groups (project_id, name, process_area, description, start_date, end_date)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`
              : `INSERT INTO task_groups (project_id, name, description, start_date, end_date)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
            supportsTaskGroupProcessArea
              ? [newProjectId, tg.name, tg.process_area, tg.description, tg.start_date, tg.end_date]
              : [newProjectId, tg.name, tg.description, tg.start_date, tg.end_date]
          );
          taskGroupIdMap.set(tg.id, inserted.rows[0].id);
        }

        const tasksResult = await client.query(
          `SELECT id, project_id, project_object_id, task_group_id, task_type, name, status,
                  start_date, end_date, assigned_to, duration, duration_unit,
                  schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
           FROM tasks
           WHERE project_id = ANY($1)`,
          [sourceProjectIds]
        );

        for (const t of tasksResult.rows) {
          const newProjectId = projectIdMap.get(t.project_id);
          if (!newProjectId) continue;

          const newProjectObjectId = t.project_object_id ? projectObjectIdMap.get(t.project_object_id) || null : null;
          const newTaskGroupId = t.task_group_id ? taskGroupIdMap.get(t.task_group_id) || null : null;

          const inserted = await client.query(
            `INSERT INTO tasks (
              project_id, project_object_id, task_group_id, task_type, name, status,
              start_date, end_date, assigned_to, duration, duration_unit,
              schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16
            ) RETURNING id`,
            [
              newProjectId,
              newProjectObjectId,
              newTaskGroupId,
              t.task_type,
              t.name,
              t.status,
              t.start_date,
              t.end_date,
              t.assigned_to,
              t.duration,
              t.duration_unit,
              t.schedule_mode_override,
              t.progress_percentage,
              t.dra_user_id,
              t.developer_user_id,
              t.notes,
            ]
          );
          taskIdMap.set(t.id, inserted.rows[0].id);
        }

        const sourceTaskIds = Array.from(taskIdMap.keys());
        if (sourceTaskIds.length > 0) {
          const taskDepsResult = await client.query(
            `SELECT task_id, depends_on_task_id
             FROM task_dependencies
             WHERE task_id = ANY($1)
               AND depends_on_task_id = ANY($1)`,
            [sourceTaskIds]
          );

          for (const dep of taskDepsResult.rows) {
            const newTaskId = taskIdMap.get(dep.task_id);
            const newDependsOnTaskId = taskIdMap.get(dep.depends_on_task_id);
            if (!newTaskId || !newDependsOnTaskId) continue;
            await client.query(
              `INSERT INTO task_dependencies (task_id, depends_on_task_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [newTaskId, newDependsOnTaskId]
            );
          }

          const scheduleItemsResult = await client.query(
            `SELECT project_id, task_id, scheduled_date
             FROM schedule_items
             WHERE project_id = ANY($1)
               AND task_id = ANY($2)`,
            [sourceProjectIds, sourceTaskIds]
          );

          for (const item of scheduleItemsResult.rows) {
            const newProjectId = projectIdMap.get(item.project_id);
            const newTaskId = taskIdMap.get(item.task_id);
            if (!newProjectId || !newTaskId) continue;

            await client.query(
              `INSERT INTO schedule_items (project_id, task_id, scheduled_date)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [newProjectId, newTaskId, item.scheduled_date]
            );
          }
        }
      }

      await client.query('COMMIT');
      return this.formatMockCycle(newCycle);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMockCycleStats(mockCycleId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT p.id) as project_count
      FROM mock_cycles mc
      LEFT JOIN projects p ON mc.id = p.mock_cycle_id
      WHERE mc.id = $1`,
      [mockCycleId]
    );

    return result.rows[0];
  }

  // Formatters
  private formatProgram(row: any) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      accentColor: row.accent_color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatMockCycle(row: any) {
    const normalizedName = this.normalizeReplacementName(row.name);

    return {
      id: row.id,
      programId: row.program_id,
      name: normalizedName,
      startDate: row.start_date,
      endDate: row.end_date,
      accentColor: row.accent_color,
      scheduleMode: row.schedule_mode || 'all_days',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeReplacementName(name: string) {
    if (!name) return name;

    const replacementSuffixPattern = /\s*\(Replacement\)+\s*$/i;
    if (!replacementSuffixPattern.test(name)) {
      return name;
    }

    const baseName = name.replace(replacementSuffixPattern, '').trim();
    return baseName || name;
  }
}

export default new ProgramService();
