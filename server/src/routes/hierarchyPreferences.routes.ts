import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

router.get('/tree-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const result = await db.query(
      `SELECT tree_order
       FROM user_hierarchy_preferences
       WHERE user_id = $1`,
      [userId]
    );

    const treeOrder = result.rows[0]?.tree_order || null;
    res.json(formatSingleResponse(treeOrder));
  } catch (error) {
    next(error);
  }
});

router.put('/tree-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { treeOrder } = req.body || {};

    await db.query(
      `INSERT INTO user_hierarchy_preferences (user_id, tree_order, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET tree_order = EXCLUDED.tree_order, updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(treeOrder || null)]
    );

    res.json(formatSingleResponse(treeOrder || null));
  } catch (error) {
    next(error);
  }
});

export default router;
