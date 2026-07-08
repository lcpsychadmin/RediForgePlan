import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import processAreaRoleAssignmentService from '../services/processAreaRoleAssignmentService.js';
import approvalWorkflowEngine from '../services/approvalWorkflowEngine.js';
import { UNIFIED_ROLE_MODEL, type UnifiedRoleKey } from '../constants/unifiedRoleModel.js';
const preferenceTable = 'global_hierarchy_preferences';

const router = Router();

router.get('/state', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT tree_order, hierarchy_state
       FROM ${preferenceTable}
       WHERE id = 1`,
    );

    const row = result.rows[0] || null;
    const hierarchyState = row?.hierarchy_state || null;
    const payload = hierarchyState && typeof hierarchyState === 'object'
      ? hierarchyState
      : {
          treeOrder: row?.tree_order || null,
        };

    res.json(formatSingleResponse(payload));
  } catch (error) {
    next(error);
  }
});

router.get('/tree-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT tree_order, hierarchy_state
       FROM ${preferenceTable}
       WHERE id = 1`,
    );

    const row = result.rows[0] || null;
    const treeOrder = row?.hierarchy_state?.treeOrder || row?.tree_order || null;
    res.json(formatSingleResponse(treeOrder));
  } catch (error) {
    next(error);
  }
});

router.put('/state', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyState = req.body || {};
    const treeOrder = hierarchyState?.treeOrder || null;

    // Merge new state with existing, but preserve keys that have their own endpoint.
    // This prevents PUT /state from wiping globalProcessAreaAccents/Icons/Descriptions/role assignments,
    // manual project process areas, picklistValues, roadmapItems, roadmapLaneAssign, or roadmapRowOrder.
    await db.query(
      `INSERT INTO ${preferenceTable} (id, tree_order, hierarchy_state, updated_at)
       VALUES (1, $1::jsonb, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         tree_order = EXCLUDED.tree_order,
         hierarchy_state = (
           jsonb_build_object(
             'globalProcessAreaAccents',    COALESCE(${preferenceTable}.hierarchy_state->'globalProcessAreaAccents', '{}'::jsonb),
             'globalProcessAreaIcons',      COALESCE(${preferenceTable}.hierarchy_state->'globalProcessAreaIcons', '{}'::jsonb),
             'globalProcessAreaDescriptions', COALESCE(${preferenceTable}.hierarchy_state->'globalProcessAreaDescriptions', '{}'::jsonb),
             'globalProcessAreaRoleAssignments', COALESCE(${preferenceTable}.hierarchy_state->'globalProcessAreaRoleAssignments', '{}'::jsonb),
             'projectManualProcessAreas', COALESCE(${preferenceTable}.hierarchy_state->'projectManualProcessAreas', '{}'::jsonb),
             'picklistValues',              COALESCE(${preferenceTable}.hierarchy_state->'picklistValues', '{}'::jsonb),
             'roadmapItems',                COALESCE(${preferenceTable}.hierarchy_state->'roadmapItems', '[]'::jsonb),
             'roadmapLaneAssign',           COALESCE(${preferenceTable}.hierarchy_state->'roadmapLaneAssign', '{}'::jsonb),
             'roadmapRowOrder',             COALESCE(${preferenceTable}.hierarchy_state->'roadmapRowOrder', '{}'::jsonb)
           ) || EXCLUDED.hierarchy_state
         ),
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(treeOrder), JSON.stringify(hierarchyState)]
    );

    res.json(formatSingleResponse(hierarchyState));
  } catch (error) {
    next(error);
  }
});

router.put('/tree-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { treeOrder } = req.body || {};

    await db.query(
      `INSERT INTO ${preferenceTable} (id, tree_order, hierarchy_state, updated_at)
       VALUES (1, $1::jsonb, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET tree_order = EXCLUDED.tree_order, hierarchy_state = COALESCE(${preferenceTable}.hierarchy_state, EXCLUDED.hierarchy_state), updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(treeOrder || null), JSON.stringify({ treeOrder: treeOrder || null })]
    );

    res.json(formatSingleResponse(treeOrder || null));
  } catch (error) {
    next(error);
  }
});

// Dedicated endpoint for global process-area settings (color + icon + description).
// Uses jsonb merge so these keys are never accidentally cleared by the
// ProjectsPage hierarchy-state save which may have empty initial values.
router.put('/global-process-areas', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      globalProcessAreaAccents = {},
      globalProcessAreaIcons = {},
      globalProcessAreaDescriptions = {},
      globalProcessAreaRoleAssignments = undefined,
      picklistValues = {},
      roadmapItems = undefined,
      roadmapRowOrder = undefined,
      roadmapLaneAssign = undefined,
    } = req.body || {};

    // Build the merge object dynamically so roadmapItems is only included when provided
    const mergeKeys = [
      'globalProcessAreaAccents', 'globalProcessAreaIcons',
      'globalProcessAreaDescriptions', 'picklistValues',
    ];
    const mergeValues: string[] = [
      JSON.stringify(globalProcessAreaAccents),
      JSON.stringify(globalProcessAreaIcons),
      JSON.stringify(globalProcessAreaDescriptions),
      JSON.stringify(picklistValues),
    ];
    if (roadmapItems !== undefined) {
      mergeKeys.push('roadmapItems');
      mergeValues.push(JSON.stringify(roadmapItems));
    }
    if (roadmapRowOrder !== undefined) {
      mergeKeys.push('roadmapRowOrder');
      mergeValues.push(JSON.stringify(roadmapRowOrder));
    }
    if (roadmapLaneAssign !== undefined) {
      mergeKeys.push('roadmapLaneAssign');
      mergeValues.push(JSON.stringify(roadmapLaneAssign));
    }
    if (globalProcessAreaRoleAssignments !== undefined) {
      mergeKeys.push('globalProcessAreaRoleAssignments');
      mergeValues.push(JSON.stringify(globalProcessAreaRoleAssignments));
    }

    const keyValuePairs = mergeKeys.map((k, i) => `'${k}', $${i + 1}::jsonb`).join(', ');

    await db.query(
      `INSERT INTO ${preferenceTable} (id, hierarchy_state, updated_at)
       VALUES (1, jsonb_build_object(${keyValuePairs}), CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         hierarchy_state = ${preferenceTable}.hierarchy_state
           || jsonb_build_object(${keyValuePairs}),
         updated_at = CURRENT_TIMESTAMP`,
      mergeValues
    );

    res.json(formatSingleResponse({
      globalProcessAreaAccents,
      globalProcessAreaIcons,
      globalProcessAreaDescriptions,
      ...(globalProcessAreaRoleAssignments !== undefined ? { globalProcessAreaRoleAssignments } : {}),
      picklistValues,
      ...(roadmapItems !== undefined ? { roadmapItems } : {}),
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/role-model', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(formatSingleResponse({ roles: UNIFIED_ROLE_MODEL }));
  } catch (error) {
    next(error);
  }
});

router.get('/global-role-assignments', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await processAreaRoleAssignmentService.getGlobalRoleAssignments();
    res.json(formatSingleResponse({ roles: UNIFIED_ROLE_MODEL, assignments }));
  } catch (error) {
    next(error);
  }
});

router.put('/global-role-assignments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await processAreaRoleAssignmentService.saveGlobalRoleAssignments(req.body?.assignments || {});
    res.json(formatSingleResponse({ roles: UNIFIED_ROLE_MODEL, assignments }));
  } catch (error) {
    next(error);
  }
});

router.get('/project-role-assignments/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const [projectAssignments, globalAssignments, discoveredProcessAreas, manualProcessAreas] = await Promise.all([
      processAreaRoleAssignmentService.getProjectRoleAssignments(projectId),
      processAreaRoleAssignmentService.getGlobalRoleAssignments(),
      processAreaRoleAssignmentService.getProjectProcessAreas(projectId),
      processAreaRoleAssignmentService.getProjectManualProcessAreas(projectId),
    ]);

    const processAreaSet = new Set<string>(discoveredProcessAreas);
    Object.keys(projectAssignments).forEach((area) => processAreaSet.add(area));
    Object.keys(globalAssignments).forEach((area) => processAreaSet.add(area));
    manualProcessAreas.forEach((area) => processAreaSet.add(area));
    const processAreas = Array.from(processAreaSet).sort((a, b) => a.localeCompare(b));

    const resolvedAssignments = processAreas.reduce((acc, processArea) => {
      const roleMap = UNIFIED_ROLE_MODEL.reduce((roleAcc, roleDef) => {
        const projectUserId = projectAssignments[processArea]?.[roleDef.key] || null;
        const globalUserId = globalAssignments[processArea]?.[roleDef.key] || null;
        roleAcc[roleDef.key] = {
          userId: projectUserId || globalUserId || null,
          source: projectUserId ? 'project' : globalUserId ? 'global' : 'unassigned',
          projectUserId,
          globalUserId,
        };
        return roleAcc;
      }, {} as Record<UnifiedRoleKey, { userId: string | null; source: 'project' | 'global' | 'unassigned'; projectUserId: string | null; globalUserId: string | null }>);
      acc[processArea] = roleMap;
      return acc;
    }, {} as Record<string, Record<UnifiedRoleKey, { userId: string | null; source: 'project' | 'global' | 'unassigned'; projectUserId: string | null; globalUserId: string | null }>>);

    res.json(formatSingleResponse({
      projectId,
      roles: UNIFIED_ROLE_MODEL,
      processAreas,
      manualProcessAreas,
      globalAssignments,
      projectAssignments,
      resolvedAssignments,
    }));
  } catch (error) {
    next(error);
  }
});

router.put('/project-role-assignments/:projectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const [assignments, manualProcessAreas] = await Promise.all([
      processAreaRoleAssignmentService.saveProjectRoleAssignments(projectId, req.body?.assignments || {}),
      processAreaRoleAssignmentService.saveProjectManualProcessAreas(projectId, req.body?.manualProcessAreas || []),
    ]);
    res.json(formatSingleResponse({ projectId, roles: UNIFIED_ROLE_MODEL, assignments, manualProcessAreas }));
  } catch (error) {
    next(error);
  }
});

const resolveWorkflowRolesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processArea = String(req.body?.processArea || '').trim();
    const workflowScope = req.body?.workflowScope === 'project' ? 'project' : 'global';
    const projectId = req.body?.projectId ? String(req.body.projectId) : null;
    const roleKeys = Array.isArray(req.body?.roleKeys)
      ? req.body.roleKeys
      : req.body?.roleKey
        ? [req.body.roleKey]
        : ['approver'];

    const validRoleKeys = roleKeys
      .map((key: unknown) => String(key))
      .filter((key: string): key is UnifiedRoleKey => UNIFIED_ROLE_MODEL.some((role) => role.key === key));

    const resolution = await approvalWorkflowEngine.resolveAssignments({
      processArea,
      workflowScope,
      projectId,
      roleKeys: validRoleKeys,
    });

    res.json(formatSingleResponse(resolution));
  } catch (error) {
    next(error);
  }
};

router.post('/workflow-role-resolution', requireAuth, resolveWorkflowRolesHandler);
router.post('/approval-workflow/resolve', requireAuth, resolveWorkflowRolesHandler);

export default router;
