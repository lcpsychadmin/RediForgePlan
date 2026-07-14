import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

router.get('/object/:globalObjectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelResult = await db.query(
      `SELECT id, global_object_id, notes, created_at, updated_at
       FROM common_data_model
       WHERE global_object_id = $1`,
      [req.params.globalObjectId]
    );

    const model = modelResult.rows[0] || null;
    if (!model) {
      res.json(formatSingleResponse({ model: null, attributes: [] }));
      return;
    }

    const attributesResult = await db.query(
      `SELECT id, common_data_model_id, canonical_attribute_name, canonical_description,
              canonical_data_type, canonical_length, canonical_business_rules, relationships,
              sort_order, created_at, updated_at
       FROM canonical_attributes
       WHERE common_data_model_id = $1
       ORDER BY sort_order ASC, canonical_attribute_name ASC`,
      [model.id]
    );

    res.json(formatSingleResponse({ model, attributes: attributesResult.rows }));
  } catch (error) {
    next(error);
  }
});

router.put('/object/:globalObjectId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = req.body?.notes || null;
    const result = await db.query(
      `INSERT INTO common_data_model (global_object_id, notes)
       VALUES ($1, $2)
       ON CONFLICT (global_object_id)
       DO UPDATE SET notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
       RETURNING id, global_object_id, notes, created_at, updated_at`,
      [req.params.globalObjectId, notes]
    );

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post('/object/:globalObjectId/attributes', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      canonicalAttributeName,
      canonicalDescription,
      canonicalDataType,
      canonicalLength,
      canonicalBusinessRules,
      relationships,
      sortOrder,
    } = req.body || {};

    if (!canonicalAttributeName?.trim()) {
      throw new ApiError(400, 'canonicalAttributeName is required', 'MISSING_FIELD');
    }

    const modelResult = await db.query(
      `INSERT INTO common_data_model (global_object_id)
       VALUES ($1)
       ON CONFLICT (global_object_id)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [req.params.globalObjectId]
    );

    const modelId = modelResult.rows[0]?.id;
    const result = await db.query(
      `INSERT INTO canonical_attributes (
          common_data_model_id,
          canonical_attribute_name,
          canonical_description,
          canonical_data_type,
          canonical_length,
          canonical_business_rules,
          relationships,
          sort_order
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, common_data_model_id, canonical_attribute_name, canonical_description,
                 canonical_data_type, canonical_length, canonical_business_rules, relationships,
                 sort_order, created_at, updated_at`,
      [
        modelId,
        canonicalAttributeName.trim(),
        canonicalDescription || null,
        canonicalDataType || null,
        canonicalLength || null,
        canonicalBusinessRules || null,
        relationships || null,
        sortOrder || 0,
      ]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/attributes/:attributeId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      canonicalAttributeName,
      canonicalDescription,
      canonicalDataType,
      canonicalLength,
      canonicalBusinessRules,
      relationships,
      sortOrder,
    } = req.body || {};

    if (!canonicalAttributeName?.trim()) {
      throw new ApiError(400, 'canonicalAttributeName is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `UPDATE canonical_attributes
       SET canonical_attribute_name = $1,
           canonical_description = $2,
           canonical_data_type = $3,
           canonical_length = $4,
           canonical_business_rules = $5,
           relationships = $6,
           sort_order = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, common_data_model_id, canonical_attribute_name, canonical_description,
                 canonical_data_type, canonical_length, canonical_business_rules, relationships,
                 sort_order, created_at, updated_at`,
      [
        canonicalAttributeName.trim(),
        canonicalDescription || null,
        canonicalDataType || null,
        canonicalLength || null,
        canonicalBusinessRules || null,
        relationships || null,
        sortOrder || 0,
        req.params.attributeId,
      ]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'Canonical attribute not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/attributes/:attributeId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM canonical_attributes WHERE id = $1', [req.params.attributeId]);
    res.json(formatSingleResponse({ success: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
