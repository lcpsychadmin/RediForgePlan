import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
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

    await db.query(
      `INSERT INTO ${preferenceTable} (id, tree_order, hierarchy_state, updated_at)
       VALUES (1, $1::jsonb, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         tree_order = EXCLUDED.tree_order,
         hierarchy_state = EXCLUDED.hierarchy_state,
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
      picklistValues = {},
      roadmapItems = undefined,
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

    res.json(formatSingleResponse({ globalProcessAreaAccents, globalProcessAreaIcons, globalProcessAreaDescriptions, picklistValues, ...(roadmapItems !== undefined ? { roadmapItems } : {}) }));
  } catch (error) {
    next(error);
  }
});

export default router;
