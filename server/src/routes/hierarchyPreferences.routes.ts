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
    const { globalProcessAreaAccents = {}, globalProcessAreaIcons = {}, globalProcessAreaDescriptions = {} } = req.body || {};

    await db.query(
      `INSERT INTO ${preferenceTable} (id, hierarchy_state, updated_at)
       VALUES (1, jsonb_build_object('globalProcessAreaAccents', $1::jsonb, 'globalProcessAreaIcons', $2::jsonb, 'globalProcessAreaDescriptions', $3::jsonb), CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET
         hierarchy_state = ${preferenceTable}.hierarchy_state
           || jsonb_build_object('globalProcessAreaAccents', $1::jsonb, 'globalProcessAreaIcons', $2::jsonb, 'globalProcessAreaDescriptions', $3::jsonb),
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(globalProcessAreaAccents), JSON.stringify(globalProcessAreaIcons), JSON.stringify(globalProcessAreaDescriptions)]
    );

    res.json(formatSingleResponse({ globalProcessAreaAccents, globalProcessAreaIcons, globalProcessAreaDescriptions }));
  } catch (error) {
    next(error);
  }
});

export default router;
