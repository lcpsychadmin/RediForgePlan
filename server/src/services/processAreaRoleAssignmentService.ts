import db from '../db.js';
import { UNIFIED_ROLE_KEYS, type UnifiedRoleKey } from '../constants/unifiedRoleModel.js';

type AssignmentMap = Record<string, Partial<Record<UnifiedRoleKey, string>>>;

type WorkflowScope = 'global' | 'project';

type RoleResolutionResult = {
  roleKey: UnifiedRoleKey;
  processArea: string;
  workflowScope: WorkflowScope;
  projectId: string | null;
  userId: string | null;
  source: 'project' | 'global' | 'unassigned';
};

const preferenceTable = 'global_hierarchy_preferences';
const GLOBAL_ASSIGNMENT_KEY = 'globalProcessAreaRoleAssignments';
const PROJECT_MANUAL_AREAS_KEY = 'projectManualProcessAreas';

const isRoleKey = (value: string): value is UnifiedRoleKey =>
  (UNIFIED_ROLE_KEYS as string[]).includes(value);

const normalizeProcessArea = (value: string) => value.trim();

const sanitizeAssignmentMap = (input: unknown): AssignmentMap => {
  if (!input || typeof input !== 'object') return {};

  const output: AssignmentMap = {};
  for (const [rawArea, rawRoles] of Object.entries(input as Record<string, unknown>)) {
    const processArea = normalizeProcessArea(rawArea);
    if (!processArea || !rawRoles || typeof rawRoles !== 'object') continue;

    const roleAssignments: Partial<Record<UnifiedRoleKey, string>> = {};
    for (const [rawRoleKey, rawUserId] of Object.entries(rawRoles as Record<string, unknown>)) {
      if (!isRoleKey(rawRoleKey)) continue;
      if (typeof rawUserId !== 'string') continue;
      const userId = rawUserId.trim();
      if (!userId) continue;
      roleAssignments[rawRoleKey] = userId;
    }

    output[processArea] = roleAssignments;
  }

  return output;
};

class ProcessAreaRoleAssignmentService {
  async getGlobalRoleAssignments(): Promise<AssignmentMap> {
    const result = await db.query(
      `SELECT hierarchy_state
       FROM ${preferenceTable}
       WHERE id = 1`
    );

    const state = result.rows[0]?.hierarchy_state;
    return sanitizeAssignmentMap(state?.[GLOBAL_ASSIGNMENT_KEY]);
  }

  async saveGlobalRoleAssignments(assignments: unknown): Promise<AssignmentMap> {
    const sanitized = sanitizeAssignmentMap(assignments);

    await db.query(
      `INSERT INTO ${preferenceTable} (id, hierarchy_state, updated_at)
       VALUES (1, jsonb_build_object($1::text, $2::jsonb), CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         hierarchy_state = COALESCE(${preferenceTable}.hierarchy_state, '{}'::jsonb)
           || jsonb_build_object($1::text, $2::jsonb),
         updated_at = CURRENT_TIMESTAMP`,
      [GLOBAL_ASSIGNMENT_KEY, JSON.stringify(sanitized)]
    );

    return sanitized;
  }

  async getProjectManualProcessAreas(projectId: string): Promise<string[]> {
    const result = await db.query(
      `SELECT hierarchy_state
       FROM ${preferenceTable}
       WHERE id = 1`
    );

    const root = result.rows[0]?.hierarchy_state?.[PROJECT_MANUAL_AREAS_KEY];
    if (!root || typeof root !== 'object') return [];

    const raw = (root as Record<string, unknown>)[projectId];
    if (!Array.isArray(raw)) return [];

    const clean = Array.from(new Set(raw
      .map((entry) => (typeof entry === 'string' ? normalizeProcessArea(entry) : ''))
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));

    return clean;
  }

  async saveProjectManualProcessAreas(projectId: string, processAreas: unknown): Promise<string[]> {
    const clean = Array.isArray(processAreas)
      ? Array.from(new Set(processAreas
          .map((entry) => (typeof entry === 'string' ? normalizeProcessArea(entry) : ''))
          .filter(Boolean)))
          .sort((a, b) => a.localeCompare(b))
      : [];

    const currentResult = await db.query(
      `SELECT hierarchy_state
       FROM ${preferenceTable}
       WHERE id = 1`
    );
    const currentState = currentResult.rows[0]?.hierarchy_state || {};
    const currentMap = currentState?.[PROJECT_MANUAL_AREAS_KEY] && typeof currentState[PROJECT_MANUAL_AREAS_KEY] === 'object'
      ? { ...(currentState[PROJECT_MANUAL_AREAS_KEY] as Record<string, unknown>) }
      : {};

    currentMap[projectId] = clean;

    await db.query(
      `INSERT INTO ${preferenceTable} (id, hierarchy_state, updated_at)
       VALUES (1, jsonb_build_object($1::text, $2::jsonb), CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         hierarchy_state = COALESCE(${preferenceTable}.hierarchy_state, '{}'::jsonb)
           || jsonb_build_object($1::text, $2::jsonb),
         updated_at = CURRENT_TIMESTAMP`,
      [PROJECT_MANUAL_AREAS_KEY, JSON.stringify(currentMap)]
    );

    return clean;
  }

  async getProjectRoleAssignments(projectId: string): Promise<AssignmentMap> {
    const result = await db.query(
      `SELECT process_area, role_key, user_id
       FROM project_process_area_role_assignments
       WHERE project_id = $1`,
      [projectId]
    );

    const assignments: AssignmentMap = {};
    for (const row of result.rows) {
      const processArea = normalizeProcessArea(row.process_area || '');
      const roleKey = row.role_key as string;
      const userId = (row.user_id || '').trim();
      if (!processArea || !isRoleKey(roleKey) || !userId) continue;

      if (!assignments[processArea]) assignments[processArea] = {};
      assignments[processArea][roleKey] = userId;
    }

    return assignments;
  }

  async saveProjectRoleAssignments(projectId: string, assignments: unknown): Promise<AssignmentMap> {
    const sanitized = sanitizeAssignmentMap(assignments);

    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM project_process_area_role_assignments WHERE project_id = $1', [projectId]);

      for (const [processArea, roleAssignments] of Object.entries(sanitized)) {
        for (const [roleKey, userId] of Object.entries(roleAssignments)) {
          if (!isRoleKey(roleKey) || !userId) continue;
          await db.query(
            `INSERT INTO project_process_area_role_assignments (project_id, process_area, role_key, user_id)
             VALUES ($1, $2, $3, $4)`,
            [projectId, processArea, roleKey, userId]
          );
        }
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return sanitized;
  }

  async getProjectProcessAreas(projectId: string): Promise<string[]> {
    const result = await db.query(
      `SELECT DISTINCT process_area
       FROM (
         SELECT COALESCE(go.process_area, parent_go.process_area) AS process_area
         FROM project_objects po
         LEFT JOIN global_objects go ON go.id = po.global_object_id
         LEFT JOIN project_objects parent_po ON parent_po.id = po.parent_project_object_id
         LEFT JOIN global_objects parent_go ON parent_go.id = parent_po.global_object_id
         WHERE po.project_id = $1

         UNION

         SELECT tg.process_area
         FROM task_groups tg
         WHERE tg.project_id = $1
       ) areas
       WHERE process_area IS NOT NULL
         AND BTRIM(process_area) <> ''
       ORDER BY process_area ASC`,
      [projectId]
    );

    return result.rows.map((row) => normalizeProcessArea(row.process_area));
  }

  async resolveRoleAssignment(params: {
    processArea: string;
    roleKey: UnifiedRoleKey;
    workflowScope: WorkflowScope;
    projectId?: string | null;
  }): Promise<RoleResolutionResult> {
    const processArea = normalizeProcessArea(params.processArea || '');
    const workflowScope: WorkflowScope = params.workflowScope === 'project' ? 'project' : 'global';
    const projectId = params.projectId || null;

    if (workflowScope === 'project' && projectId) {
      const projectResult = await db.query(
        `SELECT user_id
         FROM project_process_area_role_assignments
         WHERE project_id = $1
           AND process_area = $2
           AND role_key = $3
         LIMIT 1`,
        [projectId, processArea, params.roleKey]
      );

      const projectUserId = projectResult.rows[0]?.user_id || null;
      if (projectUserId) {
        return {
          roleKey: params.roleKey,
          processArea,
          workflowScope,
          projectId,
          userId: projectUserId,
          source: 'project',
        };
      }
    }

    const globalAssignments = await this.getGlobalRoleAssignments();
    const globalUserId = globalAssignments[processArea]?.[params.roleKey] || null;

    return {
      roleKey: params.roleKey,
      processArea,
      workflowScope,
      projectId,
      userId: globalUserId,
      source: globalUserId ? 'global' : 'unassigned',
    };
  }
}

export default new ProcessAreaRoleAssignmentService();
