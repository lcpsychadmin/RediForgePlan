// server/src/services/programService.ts
// Program and mock cycle database operations

import db from '../db.js';
import { buildDefaultCriteria, normalizeCriteria } from '../constants/mockCycleCriteria.js';

export class ProgramService {
  private mockCycleCriteriaColumnsReady: boolean | null = null;

  private async ensureMockCycleCriteriaColumns() {
    if (this.mockCycleCriteriaColumnsReady) return;
    await db.query(
      `ALTER TABLE mock_cycles
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS test_phase VARCHAR(255),
         ADD COLUMN IF NOT EXISTS entry_criteria TEXT,
         ADD COLUMN IF NOT EXISTS exit_criteria TEXT,
         ADD COLUMN IF NOT EXISTS entry_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
         ADD COLUMN IF NOT EXISTS exit_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
         ADD COLUMN IF NOT EXISTS target_success_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
         ADD COLUMN IF NOT EXISTS target_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
         ADD COLUMN IF NOT EXISTS total_records_scope INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS invalid_records INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS records_attempted INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS load_errors INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS records_loaded INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS load_success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS load_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS lead_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
         ADD COLUMN IF NOT EXISTS lead_approved_at TIMESTAMP,
         ADD COLUMN IF NOT EXISTS project_manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
         ADD COLUMN IF NOT EXISTS project_manager_approved_at TIMESTAMP`
    );
    this.mockCycleCriteriaColumnsReady = true;
  }

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
    await this.ensureMockCycleCriteriaColumns();
    // Hierarchy view: only cycles marked in_hierarchy = true
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.description, mc.test_phase, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.entry_criteria, mc.exit_criteria, mc.entry_criteria_items, mc.exit_criteria_items, mc.target_success_rate, mc.target_coverage_rate, mc.total_records_scope, mc.invalid_records, mc.records_attempted, mc.load_errors, mc.records_loaded, mc.load_success_rate, mc.load_coverage_rate, mc.lead_approved_by, mc.lead_approved_at, mc.project_manager_approved_by, mc.project_manager_approved_at, mc.in_hierarchy, mc.created_at, mc.updated_at
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
    await this.ensureMockCycleCriteriaColumns();
    // Maintain view: only active cycles (in_hierarchy = true)
    // Both hierarchy and maintain views show the same filtered list
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.description, mc.test_phase, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.entry_criteria, mc.exit_criteria, mc.entry_criteria_items, mc.exit_criteria_items, mc.target_success_rate, mc.target_coverage_rate, mc.total_records_scope, mc.invalid_records, mc.records_attempted, mc.load_errors, mc.records_loaded, mc.load_success_rate, mc.load_coverage_rate, mc.lead_approved_by, mc.lead_approved_at, mc.project_manager_approved_by, mc.project_manager_approved_at, mc.in_hierarchy, mc.created_at, mc.updated_at
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
    await this.ensureMockCycleCriteriaColumns();
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.description, mc.test_phase, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.entry_criteria, mc.exit_criteria, mc.entry_criteria_items, mc.exit_criteria_items, mc.target_success_rate, mc.target_coverage_rate, mc.total_records_scope, mc.invalid_records, mc.records_attempted, mc.load_errors, mc.records_loaded, mc.load_success_rate, mc.load_coverage_rate, mc.lead_approved_by, mc.lead_approved_at, mc.project_manager_approved_by, mc.project_manager_approved_at, mc.in_hierarchy, mc.created_at, mc.updated_at
       FROM mock_cycles mc
       JOIN projects p ON p.id = mc.project_id
       WHERE mc.project_id = $1
       ORDER BY mc.start_date DESC`,
      [projectId]
    );
    return result.rows.map((row) => this.formatMockCycle(row));
  }

  async getMockCycleById(mockCycleId: string) {
    await this.ensureMockCycleCriteriaColumns();
    const result = await db.query(
      `SELECT mc.id, p.program_id, mc.project_id, mc.name, mc.description, mc.test_phase, mc.start_date, mc.end_date, mc.accent_color, mc.schedule_mode, mc.entry_criteria, mc.exit_criteria, mc.entry_criteria_items, mc.exit_criteria_items, mc.target_success_rate, mc.target_coverage_rate, mc.total_records_scope, mc.invalid_records, mc.records_attempted, mc.load_errors, mc.records_loaded, mc.load_success_rate, mc.load_coverage_rate, mc.lead_approved_by, mc.lead_approved_at, mc.project_manager_approved_by, mc.project_manager_approved_at, mc.in_hierarchy, mc.created_at, mc.updated_at
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
    description: string | undefined,
    testPhase: string | undefined,
    startDate: string,
    endDate: string,
    scheduleMode: string = 'all_days',
    accentColor?: string
  ) {
    await this.ensureMockCycleCriteriaColumns();
    const result = await db.query(
      `INSERT INTO mock_cycles (project_id, name, description, test_phase, start_date, end_date, schedule_mode, accent_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, project_id, name, description, test_phase, start_date, end_date, accent_color, schedule_mode, created_at, updated_at`,
      [projectId, name, description || null, testPhase || null, startDate, endDate, scheduleMode, accentColor || null]
    );

    return this.getMockCycleById(result.rows[0].id);
  }

  async updateMockCycle(
    mockCycleId: string,
    data: {
      name?: string;
      description?: string;
      testPhase?: string;
      startDate?: string;
      endDate?: string;
      scheduleMode?: string;
      accentColor?: string;
      entryCriteria?: string | null;
      exitCriteria?: string | null;
      entryCriteriaItems?: unknown;
      exitCriteriaItems?: unknown;
      targetSuccessRate?: number | null;
      targetCoverageRate?: number | null;
      totalRecordsScope?: number | null;
      invalidRecords?: number | null;
      recordsAttempted?: number | null;
      loadErrors?: number | null;
      recordsLoaded?: number | null;
      loadSuccessRate?: number | null;
      loadCoverageRate?: number | null;
      leadApprovedBy?: string | null;
      leadApprovedAt?: string | null;
      projectManagerApprovedBy?: string | null;
      projectManagerApprovedAt?: string | null;
    }
  ) {
    await this.ensureMockCycleCriteriaColumns();
    const fields: string[] = [];
    const values: any[] = [mockCycleId];
    let paramCount = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(data.description || null);
      paramCount++;
    }
    if (data.testPhase !== undefined) {
      fields.push(`test_phase = $${paramCount}`);
      values.push(data.testPhase || null);
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
    if (data.entryCriteria !== undefined) {
      fields.push(`entry_criteria = $${paramCount}`);
      values.push(data.entryCriteria || null);
      paramCount++;
    }
    if (data.exitCriteria !== undefined) {
      fields.push(`exit_criteria = $${paramCount}`);
      values.push(data.exitCriteria || null);
      paramCount++;
    }
    if (data.entryCriteriaItems !== undefined) {
      const normalizedEntry = normalizeCriteria('entry', data.entryCriteriaItems);
      fields.push(`entry_criteria_items = $${paramCount}::jsonb`);
      values.push(JSON.stringify(normalizedEntry));
      paramCount++;
    }
    if (data.exitCriteriaItems !== undefined) {
      const normalizedExit = normalizeCriteria('exit', data.exitCriteriaItems);
      fields.push(`exit_criteria_items = $${paramCount}::jsonb`);
      values.push(JSON.stringify(normalizedExit));
      paramCount++;
    }
    if (data.targetSuccessRate !== undefined) {
      fields.push(`target_success_rate = $${paramCount}`);
      values.push(data.targetSuccessRate ?? 0);
      paramCount++;
    }
    if (data.targetCoverageRate !== undefined) {
      fields.push(`target_coverage_rate = $${paramCount}`);
      values.push(data.targetCoverageRate ?? 0);
      paramCount++;
    }
    if (data.totalRecordsScope !== undefined) {
      fields.push(`total_records_scope = $${paramCount}`);
      values.push(Math.max(0, data.totalRecordsScope ?? 0));
      paramCount++;
    }
    if (data.invalidRecords !== undefined) {
      fields.push(`invalid_records = $${paramCount}`);
      values.push(Math.max(0, data.invalidRecords ?? 0));
      paramCount++;
    }
    if (data.recordsAttempted !== undefined) {
      fields.push(`records_attempted = $${paramCount}`);
      values.push(Math.max(0, data.recordsAttempted ?? 0));
      paramCount++;
    }
    if (data.loadErrors !== undefined) {
      fields.push(`load_errors = $${paramCount}`);
      values.push(Math.max(0, data.loadErrors ?? 0));
      paramCount++;
    }
    if (data.recordsLoaded !== undefined) {
      fields.push(`records_loaded = $${paramCount}`);
      values.push(Math.max(0, data.recordsLoaded ?? 0));
      paramCount++;
    }
    if (data.leadApprovedBy !== undefined) {
      fields.push(`lead_approved_by = $${paramCount}`);
      values.push(data.leadApprovedBy || null);
      paramCount++;
    }
    if (data.leadApprovedAt !== undefined) {
      fields.push(`lead_approved_at = $${paramCount}`);
      values.push(data.leadApprovedAt || null);
      paramCount++;
    }
    if (data.projectManagerApprovedBy !== undefined) {
      fields.push(`project_manager_approved_by = $${paramCount}`);
      values.push(data.projectManagerApprovedBy || null);
      paramCount++;
    }
    if (data.projectManagerApprovedAt !== undefined) {
      fields.push(`project_manager_approved_at = $${paramCount}`);
      values.push(data.projectManagerApprovedAt || null);
      paramCount++;
    }

    if (fields.length === 0) return this.getMockCycleById(mockCycleId);

    const hasDirectRateUpdate = data.loadSuccessRate !== undefined || data.loadCoverageRate !== undefined;
    if (hasDirectRateUpdate) {
      if (data.loadSuccessRate !== undefined) {
        fields.push(`load_success_rate = $${paramCount}`);
        values.push(data.loadSuccessRate ?? 0);
        paramCount++;
      }
      if (data.loadCoverageRate !== undefined) {
        fields.push(`load_coverage_rate = $${paramCount}`);
        values.push(data.loadCoverageRate ?? 0);
        paramCount++;
      }
    } else {
      fields.push(`load_success_rate = CASE WHEN COALESCE(records_attempted, 0) > 0 THEN ROUND((COALESCE(records_loaded, 0)::NUMERIC / records_attempted::NUMERIC) * 100, 2) ELSE 0 END`);
      fields.push(`load_coverage_rate = CASE WHEN COALESCE(total_records_scope, 0) > 0 THEN ROUND((COALESCE(records_loaded, 0)::NUMERIC / total_records_scope::NUMERIC) * 100, 2) ELSE 0 END`);
    }

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
    await this.ensureMockCycleCriteriaColumns();
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
                mc.entry_criteria,
                mc.exit_criteria,
                mc.entry_criteria_items,
                mc.exit_criteria_items,
                mc.target_success_rate,
                mc.target_coverage_rate,
                mc.total_records_scope,
                mc.invalid_records,
                mc.records_attempted,
                mc.load_errors,
                mc.records_loaded,
                mc.load_success_rate,
                mc.load_coverage_rate,
                mc.lead_approved_by,
                mc.lead_approved_at,
                mc.project_manager_approved_by,
                mc.project_manager_approved_at,
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
        `INSERT INTO mock_cycles (
          project_id,
          name,
          start_date,
          end_date,
          schedule_mode,
          accent_color,
          entry_criteria,
          exit_criteria,
          entry_criteria_items,
          exit_criteria_items,
          target_success_rate,
          target_coverage_rate,
          total_records_scope,
          invalid_records,
          records_attempted,
          load_errors,
          records_loaded,
          load_success_rate,
          load_coverage_rate,
          lead_approved_by,
          lead_approved_at,
          project_manager_approved_by,
          project_manager_approved_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19, NULL, NULL, NULL, NULL)
         RETURNING id`,
        [
          sourceCycle.project_id,
          newCycleName,
          sourceCycle.start_date,
          sourceCycle.end_date,
          sourceCycle.schedule_mode || 'all_days',
          sourceCycle.accent_color || null,
          sourceCycle.entry_criteria || null,
          sourceCycle.exit_criteria || null,
          JSON.stringify(sourceCycle.entry_criteria_items || buildDefaultCriteria('entry', true)),
          JSON.stringify(sourceCycle.exit_criteria_items || buildDefaultCriteria('exit', true)),
          sourceCycle.target_success_rate ?? 95,
          sourceCycle.target_coverage_rate ?? 95,
          sourceCycle.total_records_scope ?? 0,
          sourceCycle.invalid_records ?? 0,
          sourceCycle.records_attempted ?? 0,
          sourceCycle.load_errors ?? 0,
          sourceCycle.records_loaded ?? 0,
          sourceCycle.load_success_rate ?? 0,
          sourceCycle.load_coverage_rate ?? 0,
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
        // project_objects (data objects) are NOT cloned — they live in the
        // project inventory and are shared across cycles.

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

          // project_object_id kept as-is — references shared inventory object.
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
              t.project_object_id,
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
    await this.ensureMockCycleCriteriaColumns();
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
                mc.schedule_mode,
                mc.entry_criteria,
                mc.exit_criteria,
                mc.entry_criteria_items,
                mc.exit_criteria_items,
                mc.target_success_rate,
                mc.target_coverage_rate,
                mc.total_records_scope,
                mc.invalid_records,
                mc.records_attempted,
                mc.load_errors,
                mc.records_loaded,
                mc.load_success_rate,
                mc.load_coverage_rate,
                mc.lead_approved_by,
                mc.lead_approved_at,
                mc.project_manager_approved_by,
                mc.project_manager_approved_at
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

      // Since task_groups and tasks are now cycle-scoped (mock_cycle_id), the target
      // cycle does not need an isolated project.  Point it at the source's project so
      // both cycles share the same project inventory.
      if (targetProjectId !== sourceProjectId) {
        targetProjectId = sourceProjectId;
        await client.query(
          `UPDATE mock_cycles SET project_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [targetMockCycleId, targetProjectId]
        );
      }

      // Delete only THIS cycle's task data (tasks/task_groups are cycle-scoped).
      await client.query(`DELETE FROM tasks        WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
      await client.query(`DELETE FROM task_groups  WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);
      await client.query(`DELETE FROM schedule_items WHERE mock_cycle_id = $1 AND mock_cycle_id IS NOT NULL`, [targetMockCycleId]);

      // ── Copy execution data from source cycle to the effective target project ──
      // NOTE: project_objects (data objects) are NOT copied — they live in the
      // project inventory and are shared across cycles.  Only task_groups and
      // tasks are cycle-specific.  Tasks keep their original project_object_id
      // so they continue to reference the shared inventory objects.

      const taskGroupIdMap = new Map<string, string>();
      const taskIdMap = new Map<string, string>();

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
        // project_object_id is preserved as-is — it references a shared inventory object.
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
            t.project_object_id,
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
             entry_criteria = $6,
             exit_criteria = $7,
             entry_criteria_items = $8,
             exit_criteria_items = $9,
             target_success_rate = $10,
             target_coverage_rate = $11,
             total_records_scope = $12,
             invalid_records = $13,
             records_attempted = $14,
             load_errors = $15,
             records_loaded = $16,
             load_success_rate = $17,
             load_coverage_rate = $18,
             lead_approved_by = NULL,
             lead_approved_at = NULL,
             project_manager_approved_by = NULL,
             project_manager_approved_at = NULL,
             updated_at    = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          targetMockCycleId,
          sourceCycle.start_date,
          sourceCycle.end_date,
          sourceCycle.schedule_mode || 'all_days',
          sourceCycle.accent_color || null,
          sourceCycle.entry_criteria || null,
          sourceCycle.exit_criteria || null,
          JSON.stringify(sourceCycle.entry_criteria_items || buildDefaultCriteria('entry', true)),
          JSON.stringify(sourceCycle.exit_criteria_items || buildDefaultCriteria('exit', true)),
          sourceCycle.target_success_rate ?? 95,
          sourceCycle.target_coverage_rate ?? 95,
          sourceCycle.total_records_scope ?? 0,
          sourceCycle.invalid_records ?? 0,
          sourceCycle.records_attempted ?? 0,
          sourceCycle.load_errors ?? 0,
          sourceCycle.records_loaded ?? 0,
          sourceCycle.load_success_rate ?? 0,
          sourceCycle.load_coverage_rate ?? 0,
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
    const entryItems = normalizeCriteria('entry', row.entry_criteria_items);
    const exitItems = normalizeCriteria('exit', row.exit_criteria_items);

    const totalRecordsScope = Number(row.total_records_scope || 0);
    const invalidRecords = Number(row.invalid_records || 0);
    const recordsAttempted = Number(row.records_attempted || 0);
    const loadErrors = Number(row.load_errors || 0);
    const recordsLoaded = Number(row.records_loaded || 0);

    const computedSuccessRate = recordsAttempted > 0
      ? Number(((recordsLoaded / recordsAttempted) * 100).toFixed(2))
      : 0;
    const computedCoverageRate = totalRecordsScope > 0
      ? Number(((recordsLoaded / totalRecordsScope) * 100).toFixed(2))
      : 0;

    return {
      id: row.id,
      programId: row.program_id,
      projectId: row.project_id,
      name: normalizedName,
      description: row.description || null,
      testPhase: row.test_phase || null,
      startDate: row.start_date,
      endDate: row.end_date,
      accentColor: row.accent_color,
      scheduleMode: row.schedule_mode || 'all_days',
      entryCriteria: row.entry_criteria,
      exitCriteria: row.exit_criteria,
      entryCriteriaItems: entryItems,
      exitCriteriaItems: exitItems,
      targetLoadPercentages: {
        successRate: Number(row.target_success_rate ?? 95),
        coverageRate: Number(row.target_coverage_rate ?? 95),
      },
      loadMetrics: {
        totalRecordsScope,
        invalidRecords,
        recordsAttempted,
        loadErrors,
        recordsLoaded,
        loadSuccessRate: Number(row.load_success_rate ?? computedSuccessRate),
        loadCoverageRate: Number(row.load_coverage_rate ?? computedCoverageRate),
      },
      approvals: {
        leadApprovedBy: row.lead_approved_by || null,
        leadApprovedAt: row.lead_approved_at || null,
        projectManagerApprovedBy: row.project_manager_approved_by || null,
        projectManagerApprovedAt: row.project_manager_approved_at || null,
      },
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
