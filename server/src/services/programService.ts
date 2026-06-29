// server/src/services/programService.ts
// Program and mock cycle database operations

import db from '../db.js';

export class ProgramService {
  // Programs
  async getAllPrograms() {
    const result = await db.query(
      'SELECT id, name, description, accent_color, created_at, updated_at FROM programs ORDER BY created_at DESC'
    );
    return result.rows.map((row) => this.formatProgram(row));
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

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE programs SET ${fields.join(', ')} WHERE id = $1 RETURNING id, name, description, accent_color, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatProgram(result.rows[0]);
  }

  async deleteProgram(programId: string) {
    const result = await db.query('DELETE FROM programs WHERE id = $1 RETURNING id', [programId]);
    return result.rows.length > 0;
  }

  async getProgramStats(programId: string) {
    const result = await db.query(
      `SELECT
        COUNT(DISTINCT mc.id) as mock_cycle_count,
        COUNT(DISTINCT p.id) as project_count
      FROM programs pr
      LEFT JOIN projects p ON pr.id = p.program_id
      LEFT JOIN mock_cycles mc ON p.id = mc.project_id
      WHERE pr.id = $1`,
      [programId]
    );

    return result.rows[0];
  }

  // Mock Cycles
  async getMockCyclesByProgram(programId: string) {
    // Hierarchy view: only cycles marked in_hierarchy = true
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.in_hierarchy, mc.created_at, mc.updated_at
       FROM mock_cycles mc
       JOIN projects p ON p.id = mc.project_id
       WHERE p.program_id = $1
         AND mc.in_hierarchy = true
       ORDER BY mc.start_date DESC`,
      [programId]
    );
    return result.rows.map((row) => this.formatMockCycle(row));
  }

  async getAllMockCyclesByProgram(programId: string) {
    // Maintain view: only active cycles (in_hierarchy = true)
    // Both hierarchy and maintain views show the same filtered list
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.in_hierarchy, mc.created_at, mc.updated_at
       FROM mock_cycles mc
       JOIN projects p ON p.id = mc.project_id
       WHERE p.program_id = $1
         AND mc.in_hierarchy = true
       ORDER BY mc.start_date DESC`,
      [programId]
    );
    return result.rows.map((row) => this.formatMockCycle(row));
  }

  async getMockCyclesByProject(projectId: string) {
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.in_hierarchy, mc.created_at, mc.updated_at
       FROM mock_cycles mc
       JOIN projects p ON p.id = mc.project_id
       WHERE mc.project_id = $1
       ORDER BY mc.start_date DESC`,
      [projectId]
    );
    return result.rows.map((row) => this.formatMockCycle(row));
  }

  async getMockCycleById(mockCycleId: string) {
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.in_hierarchy, mc.created_at, mc.updated_at
       FROM mock_cycles mc
       JOIN projects p ON p.id = mc.project_id
       WHERE mc.id = $1`,
      [mockCycleId]
    );
    if (result.rows.length === 0) return null;
    return this.formatMockCycle(result.rows[0]);
  }

  async createMockCycle(
    projectId: string,
    name: string,
    startDate: string,
    endDate: string,
    scheduleMode: string = 'all_days',
    accentColor?: string
  ) {
    const result = await db.query(
      `INSERT INTO mock_cycles (project_id, name, start_date, end_date, schedule_mode, accent_color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, name, start_date, end_date, accent_color, schedule_mode, created_at, updated_at`,
      [projectId, name, startDate, endDate, scheduleMode, accentColor || null]
    );

    return this.getMockCycleById(result.rows[0].id);
  }

  async updateMockCycle(
    mockCycleId: string,
    data: { name?: string; startDate?: string; endDate?: string; scheduleMode?: string; accentColor?: string }
  ) {
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

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE mock_cycles
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.getMockCycleById(mockCycleId);
  }

  async reassignMockCycleToProject(mockCycleId: string, projectId: string) {
    const result = await db.query(
      `UPDATE mock_cycles mc
       SET project_id = $2,
           updated_at = CURRENT_TIMESTAMP
       FROM projects p
       WHERE mc.id = $1
         AND p.id = $2
         AND p.program_id = (
           SELECT p2.program_id
           FROM projects p2
           JOIN mock_cycles mc2 ON mc2.project_id = p2.id
           WHERE mc2.id = $1
         )
       RETURNING mc.id`,
      [mockCycleId, projectId]
    );

    return result.rows.length > 0;
  }

  async deleteMockCycle(mockCycleId: string) {
    // Soft-delete: just mark the mock cycle as removed from hierarchy.
    // Tasks, objects, and other project data remain intact.
    const result = await db.query(
      'UPDATE mock_cycles SET in_hierarchy = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [mockCycleId]
    );
    return result.rows.length > 0;
  }

  async cloneMockCycle(sourceMockCycleId: string, data?: { name?: string }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const sourceCycleResult = await client.query(
        `SELECT mc.id,
                mc.project_id,
                p.program_id,
                mc.name,
                mc.start_date,
                mc.end_date,
                mc.accent_color,
                mc.schedule_mode,
                mc.created_at,
                mc.updated_at
         FROM mock_cycles mc
         JOIN projects p ON p.id = mc.project_id
         WHERE mc.id = $1`,
        [sourceMockCycleId]
      );
      if (sourceCycleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const sourceCycle = sourceCycleResult.rows[0];
      const newCycleName = (data?.name || `${sourceCycle.name} Copy`).trim();

      const newCycleResult = await client.query(
        `INSERT INTO mock_cycles (project_id, name, start_date, end_date, schedule_mode, accent_color)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          sourceCycle.project_id,
          newCycleName,
          sourceCycle.start_date,
          sourceCycle.end_date,
          sourceCycle.schedule_mode || 'all_days',
          sourceCycle.accent_color || null,
        ]
      );

      const newCycleId = newCycleResult.rows[0].id;

      const projectsResult = await client.query(
        `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.accent_color, p.progress_percentage
         FROM projects p
         JOIN mock_cycles mc ON mc.project_id = p.id
         WHERE mc.id = $1
         ORDER BY p.updated_at DESC, p.created_at DESC
         LIMIT 1`,
        [sourceMockCycleId]
      );

      const projectIdMap = new Map<string, string>();
      for (const p of projectsResult.rows) {
        const insertedProject = await client.query(
          `INSERT INTO projects (program_id, name, description, start_date, end_date, accent_color, progress_percentage)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [sourceCycle.program_id, p.name, p.description, p.start_date, p.end_date, p.accent_color, p.progress_percentage || 0]
        );
        projectIdMap.set(p.id, insertedProject.rows[0].id);
      }

      if (projectIdMap.size > 0) {
        const newProjectId = Array.from(projectIdMap.values())[0];
        await client.query(
          `UPDATE mock_cycles SET project_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [newCycleId, newProjectId]
        );
      }

      const sourceProjectIds = Array.from(projectIdMap.keys());
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
           WHERE mock_cycle_id = $1`,
          [sourceMockCycleId]
        );

        for (const po of projectObjectsResult.rows) {
          const newProjectId = Array.from(projectIdMap.values())[0];
          if (!newProjectId) continue;
          const inserted = await client.query(
            `INSERT INTO project_objects (
              project_id, mock_cycle_id, global_object_id, complexity, deployment_disposition, build_type,
              object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
              factor_type, load_method, start_date, end_date, status, dra_user_id,
              developer_user_id, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16, $17,
              $18, $19
            ) RETURNING id`,
            [
              newProjectId, newCycleId,
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
             WHERE mock_cycle_id = $1`,
            [sourceMockCycleId]
          );
        } catch {
          supportsTaskGroupProcessArea = false;
          taskGroupsResult = await client.query(
            `SELECT id, project_id, name, NULL::VARCHAR AS process_area, description, start_date, end_date
             FROM task_groups
             WHERE mock_cycle_id = $1`,
            [sourceMockCycleId]
          );
        }

        for (const tg of taskGroupsResult.rows) {
          const newProjectId = Array.from(projectIdMap.values())[0];
          if (!newProjectId) continue;
          const inserted = await client.query(
            supportsTaskGroupProcessArea
              ? `INSERT INTO task_groups (project_id, mock_cycle_id, name, process_area, description, start_date, end_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`
              : `INSERT INTO task_groups (project_id, mock_cycle_id, name, description, start_date, end_date)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
            supportsTaskGroupProcessArea
              ? [newProjectId, newCycleId, tg.name, tg.process_area, tg.description, tg.start_date, tg.end_date]
              : [newProjectId, newCycleId, tg.name, tg.description, tg.start_date, tg.end_date]
          );
          taskGroupIdMap.set(tg.id, inserted.rows[0].id);
        }

        const tasksResult = await client.query(
          `SELECT id, project_id, project_object_id, task_group_id, task_type, name, status,
                  start_date, end_date, assigned_to, duration, duration_unit,
                  schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
           FROM tasks
           WHERE mock_cycle_id = $1`,
          [sourceMockCycleId]
        );

        for (const t of tasksResult.rows) {
          const newProjectId = Array.from(projectIdMap.values())[0];
          if (!newProjectId) continue;

          const newProjectObjectId = t.project_object_id ? projectObjectIdMap.get(t.project_object_id) || null : null;
          const newTaskGroupId = t.task_group_id ? taskGroupIdMap.get(t.task_group_id) || null : null;

          const inserted = await client.query(
            `INSERT INTO tasks (
              project_id, mock_cycle_id, project_object_id, task_group_id, task_type, name, status,
              start_date, end_date, assigned_to, duration, duration_unit,
              schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12,
              $13, $14, $15, $16, $17
            ) RETURNING id`,
            [
              newProjectId, newCycleId,
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
            `SELECT task_id, scheduled_date
             FROM schedule_items
             WHERE mock_cycle_id = $1
               AND task_id = ANY($2)`,
            [sourceMockCycleId, sourceTaskIds]
          );

          for (const item of scheduleItemsResult.rows) {
            const newProjectId = Array.from(projectIdMap.values())[0];
            const newTaskId = taskIdMap.get(item.task_id);
            if (!newProjectId || !newTaskId) continue;

            await client.query(
              `INSERT INTO schedule_items (project_id, mock_cycle_id, task_id, scheduled_date)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [newProjectId, newCycleId, newTaskId, item.scheduled_date]
            );
          }
        }
      }

      await client.query('COMMIT');
      return this.getMockCycleById(newCycleId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async copyMockCycleToExisting(sourceMockCycleId: string, targetMockCycleId: string) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const cycleByIdQuery =
        `SELECT mc.id,
                mc.project_id,
                p.program_id,
                mc.name,
                mc.start_date,
                mc.end_date,
                mc.accent_color,
                mc.schedule_mode
         FROM mock_cycles mc
         JOIN projects p ON p.id = mc.project_id
         WHERE mc.id = $1`;

      const sourceCycleResult = await client.query(cycleByIdQuery, [sourceMockCycleId]);
      const targetCycleResult = await client.query(cycleByIdQuery, [targetMockCycleId]);

      if (sourceCycleResult.rows.length === 0 || targetCycleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const sourceCycle = sourceCycleResult.rows[0];
      const targetCycle = targetCycleResult.rows[0];

      if (sourceCycle.id === targetCycle.id) {
        throw new Error('Source and destination mock cycles must be different.');
      }

      const sourceProjectId = sourceCycle.project_id as string;
      let targetProjectId = targetCycle.project_id as string;

      // Fetch source project metadata (needed whether we're creating a new target project
      // or updating an existing dedicated one).
      const sourceProjectResult = await client.query(
        `SELECT name, description, start_date, end_date, accent_color, progress_percentage
         FROM projects
         WHERE id = $1`,
        [sourceProjectId]
      );
      if (sourceProjectResult.rows.length === 0) {
        throw new Error('Unable to locate source project for the selected mock cycle.');
      }
      const sourceProject = sourceProjectResult.rows[0];

      // Determine whether the target cycle's project is shared with other cycles.
      // A "shared" project is one that belongs to more than one mock cycle, or is
      // the exact same project as the source (which would make DELETE/INSERT on it
      // destroy the source data before it can be read).
      const sharedCheckResult = await client.query(
        `SELECT COUNT(*) AS cnt FROM mock_cycles WHERE project_id = $1`,
        [targetProjectId]
      );
      const targetProjectCycleCount = parseInt(sharedCheckResult.rows[0].cnt, 10);
      const targetProjectIsShared =
        targetProjectCycleCount > 1 || sourceProjectId === targetProjectId;

      if (targetProjectIsShared) {
        // Give the target cycle its own dedicated project so the copy is isolated.
        // The new project lives under the same program as the source cycle.
        const newProjectResult = await client.query(
          `INSERT INTO projects (program_id, name, description, start_date, end_date, accent_color, progress_percentage)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            sourceCycle.program_id,
            sourceProject.name,
            sourceProject.description,
            sourceProject.start_date,
            sourceProject.end_date,
            sourceProject.accent_color,
            sourceProject.progress_percentage || 0,
          ]
        );
        targetProjectId = newProjectResult.rows[0].id;

        // Repoint the target cycle to its new private project.
        await client.query(
          `UPDATE mock_cycles SET project_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [targetMockCycleId, targetProjectId]
        );
      } else {
        // Target has its own dedicated project — update its metadata then clear it
        // before filling with copied data.
        await client.query(
          `UPDATE projects
           SET name = $2,
               description = $3,
               start_date = $4,
               end_date = $5,
               accent_color = $6,
               progress_percentage = $7,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            targetProjectId,
            sourceProject.name,
            sourceProject.description,
            sourceProject.start_date,
            sourceProject.end_date,
            sourceProject.accent_color,
            sourceProject.progress_percentage || 0,
          ]
        );

        // Delete only THIS cycle's execution data (scope by mock_cycle_id so
        // sibling cycles that still share the project are not affected).
        // The AND mock_cycle_id IS NOT NULL guard is belt-and-suspenders:
        // project_objects added via the Inventory tab have mock_cycle_id = NULL
        // and must NEVER be deleted by copy operations.
        await client.query(`DELETE FROM tasks           WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
        await client.query(`DELETE FROM task_groups     WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
        await client.query(`DELETE FROM project_objects WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
        await client.query(`DELETE FROM schedule_items  WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
      }

      // ── Copy execution data from source cycle to the effective target project ──

      const projectObjectIdMap = new Map<string, string>();
      const taskGroupIdMap = new Map<string, string>();
      const taskIdMap = new Map<string, string>();

      // Data Objects (project_objects)
      const projectObjectsResult = await client.query(
        `SELECT id, global_object_id, complexity, deployment_disposition, build_type,
                object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
                factor_type, load_method, start_date, end_date, status, dra_user_id,
                developer_user_id, notes
         FROM project_objects
         WHERE mock_cycle_id = $1`,
        [sourceMockCycleId]
      );

      for (const po of projectObjectsResult.rows) {
        const inserted = await client.query(
          `INSERT INTO project_objects (
            project_id, mock_cycle_id, global_object_id, complexity, deployment_disposition, build_type,
            object_type, cutover_phase, ddm_approach, risk_security_type, migration_type,
            factor_type, load_method, start_date, end_date, status, dra_user_id,
            developer_user_id, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19
          ) RETURNING id`,
          [
            targetProjectId, targetMockCycleId,
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

      // Object dependencies
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

      // Process Areas + Plan Groups (task_groups)
      let taskGroupsResult: { rows: any[] };
      let supportsTaskGroupProcessArea = true;
      try {
        taskGroupsResult = await client.query(
          `SELECT id, name, process_area, description, start_date, end_date
           FROM task_groups
           WHERE mock_cycle_id = $1`,
          [sourceMockCycleId]
        );
      } catch {
        supportsTaskGroupProcessArea = false;
        taskGroupsResult = await client.query(
          `SELECT id, name, NULL::VARCHAR AS process_area, description, start_date, end_date
           FROM task_groups
           WHERE mock_cycle_id = $1`,
          [sourceMockCycleId]
        );
      }

      for (const tg of taskGroupsResult.rows) {
        const inserted = await client.query(
          supportsTaskGroupProcessArea
            ? `INSERT INTO task_groups (project_id, mock_cycle_id, name, process_area, description, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id`
            : `INSERT INTO task_groups (project_id, mock_cycle_id, name, description, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
          supportsTaskGroupProcessArea
            ? [targetProjectId, targetMockCycleId, tg.name, tg.process_area, tg.description, tg.start_date, tg.end_date]
            : [targetProjectId, targetMockCycleId, tg.name, tg.description, tg.start_date, tg.end_date]
        );
        taskGroupIdMap.set(tg.id, inserted.rows[0].id);
      }

      // Tasks
      const tasksResult = await client.query(
        `SELECT id, project_object_id, task_group_id, task_type, name, status,
                start_date, end_date, assigned_to, duration, duration_unit,
                schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
         FROM tasks
         WHERE mock_cycle_id = $1`,
        [sourceMockCycleId]
      );

      for (const t of tasksResult.rows) {
        const newProjectObjectId = t.project_object_id ? projectObjectIdMap.get(t.project_object_id) || null : null;
        const newTaskGroupId = t.task_group_id ? taskGroupIdMap.get(t.task_group_id) || null : null;

        const inserted = await client.query(
          `INSERT INTO tasks (
            project_id, mock_cycle_id, project_object_id, task_group_id, task_type, name, status,
            start_date, end_date, assigned_to, duration, duration_unit,
            schedule_mode_override, progress_percentage, dra_user_id, developer_user_id, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17
          ) RETURNING id`,
          [
            targetProjectId, targetMockCycleId,
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

      // Task dependencies
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

        // Schedule items
        const scheduleItemsResult = await client.query(
          `SELECT task_id, scheduled_date
           FROM schedule_items
           WHERE mock_cycle_id = $1
             AND task_id = ANY($2)`,
          [sourceMockCycleId, sourceTaskIds]
        );

        for (const item of scheduleItemsResult.rows) {
          const newTaskId = taskIdMap.get(item.task_id);
          if (!newTaskId) continue;
          await client.query(
            `INSERT INTO schedule_items (project_id, mock_cycle_id, task_id, scheduled_date)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [targetProjectId, targetMockCycleId, newTaskId, item.scheduled_date]
          );
        }
      }

      // Sync cycle-level metadata (dates, schedule mode, accent colour) from source.
      await client.query(
        `UPDATE mock_cycles
         SET start_date    = $2,
             end_date      = $3,
             schedule_mode = $4,
             accent_color  = $5,
             updated_at    = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          targetMockCycleId,
          sourceCycle.start_date,
          sourceCycle.end_date,
          sourceCycle.schedule_mode || 'all_days',
          sourceCycle.accent_color || null,
        ]
      );

      await client.query('COMMIT');
      return this.getMockCycleById(targetMockCycleId);
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
        1::int as project_count
      FROM mock_cycles mc
      WHERE mc.id = $1`,
      [mockCycleId]
    );

    return result.rows[0] || { project_count: 0 };
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
      projectId: row.project_id,
      name: normalizedName,
      startDate: row.start_date,
      endDate: row.end_date,
      accentColor: row.accent_color,
      scheduleMode: row.schedule_mode || 'all_days',
      inHierarchy: row.in_hierarchy !== false,
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
