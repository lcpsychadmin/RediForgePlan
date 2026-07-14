import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

router.get('/:objectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelResult = await db.query(
      `SELECT id, global_object_id, object_name, notes, created_at, updated_at
       FROM common_data_model
       WHERE global_object_id = $1`,
      [req.params.objectId]
    );

    const model = modelResult.rows[0] || null;
    if (!model) {
      res.json(formatSingleResponse({ model: null, attributes: [], relationships: [] }));
      return;
    }

    const attributesResult = await db.query(
      `SELECT id, common_data_model_id, attribute_name, attribute_description,
              data_type, length, business_rules, sort_order, created_at, updated_at
       FROM cdm_attributes
       WHERE common_data_model_id = $1
       ORDER BY sort_order ASC, attribute_name ASC`,
      [model.id]
    );

    const relationshipsResult = await db.query(
      `SELECT id, common_data_model_id, source_attribute_id, source_attribute_name,
              target_object_name, target_attribute_name, relationship_type,
              business_rules, sort_order, created_at, updated_at
       FROM cdm_relationships
       WHERE common_data_model_id = $1
       ORDER BY sort_order ASC, target_object_name ASC`,
      [model.id]
    );

    res.json(formatSingleResponse({
      model,
      attributes: attributesResult.rows,
      relationships: relationshipsResult.rows,
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:objectId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.connect();
  try {
    const notes = req.body?.notes || null;
    const objectName = req.body?.objectName || null;
    const attributes = Array.isArray(req.body?.attributes) ? req.body.attributes : [];
    const relationships = Array.isArray(req.body?.relationships) ? req.body.relationships : [];

    await client.query('BEGIN');

    const modelResult = await client.query(
      `INSERT INTO common_data_model (global_object_id, object_name, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (global_object_id)
       DO UPDATE SET object_name = EXCLUDED.object_name,
                     notes = EXCLUDED.notes,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING id, global_object_id, object_name, notes, created_at, updated_at`,
      [req.params.objectId, objectName, notes]
    );

    const model = modelResult.rows[0];

    await client.query('DELETE FROM cdm_relationships WHERE common_data_model_id = $1', [model.id]);
    await client.query('DELETE FROM cdm_attributes WHERE common_data_model_id = $1', [model.id]);

    for (let i = 0; i < attributes.length; i += 1) {
      const row = attributes[i] || {};
      const attributeName = String(row.attributeName || '').trim();
      if (!attributeName) continue;

      await client.query(
        `INSERT INTO cdm_attributes (
            common_data_model_id,
            attribute_name,
            attribute_description,
            data_type,
            length,
            business_rules,
            sort_order
          )
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          model.id,
          attributeName,
          row.attributeDescription || null,
          row.dataType || null,
          row.length || null,
          row.businessRules || null,
          Number(row.sortOrder ?? i) || i,
        ]
      );
    }

    for (let i = 0; i < relationships.length; i += 1) {
      const row = relationships[i] || {};
      const sourceAttributeName = String(row.sourceAttributeName || '').trim();
      const targetObjectName = String(row.targetObjectName || '').trim();
      if (!sourceAttributeName || !targetObjectName) continue;

      await client.query(
        `INSERT INTO cdm_relationships (
            common_data_model_id,
            source_attribute_id,
            source_attribute_name,
            target_object_name,
            target_attribute_name,
            relationship_type,
            business_rules,
            sort_order
          )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          model.id,
          row.sourceAttributeId || null,
          sourceAttributeName,
          targetObjectName,
          row.targetAttributeName || null,
          row.relationshipType || null,
          row.businessRules || null,
          Number(row.sortOrder ?? i) || i,
        ]
      );
    }

    const refreshAttributes = await client.query(
      `SELECT id, common_data_model_id, attribute_name, attribute_description,
              data_type, length, business_rules, sort_order, created_at, updated_at
       FROM cdm_attributes
       WHERE common_data_model_id = $1
       ORDER BY sort_order ASC, attribute_name ASC`,
      [model.id]
    );

    const refreshRelationships = await client.query(
      `SELECT id, common_data_model_id, source_attribute_id, source_attribute_name,
              target_object_name, target_attribute_name, relationship_type,
              business_rules, sort_order, created_at, updated_at
       FROM cdm_relationships
       WHERE common_data_model_id = $1
       ORDER BY sort_order ASC, target_object_name ASC`,
      [model.id]
    );

    await client.query('COMMIT');

    res.status(201).json(formatSingleResponse({
      model,
      attributes: refreshAttributes.rows,
      relationships: refreshRelationships.rows,
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.put('/:objectId/attribute/:attributeId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attributeName = String(req.body?.attributeName || '').trim();
    if (!attributeName) {
      throw new ApiError(400, 'attributeName is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `UPDATE cdm_attributes
       SET attribute_name = $1,
           attribute_description = $2,
           data_type = $3,
           length = $4,
           business_rules = $5,
           sort_order = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, common_data_model_id, attribute_name, attribute_description,
                 data_type, length, business_rules, sort_order, created_at, updated_at`,
      [
        attributeName,
        req.body?.attributeDescription || null,
        req.body?.dataType || null,
        req.body?.length || null,
        req.body?.businessRules || null,
        req.body?.sortOrder || 0,
        req.params.attributeId,
      ]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'CDM attribute not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/:objectId/attribute/:attributeId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM cdm_attributes WHERE id = $1', [req.params.attributeId]);
    res.json(formatSingleResponse({ success: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
