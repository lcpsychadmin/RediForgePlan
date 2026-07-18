// server/src/routes/mapping.routes.ts
// Mapping API routes for object-table and field-object mappings

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

const router = Router();

const normalizeArrayMetadata = (value: any) => (Array.isArray(value) ? value : []);

const formatMappingModel = (row: any) => ({
  id: row?.id,
  objectId: row?.global_object_id,
  applicationId: row?.application_id,
  mappedTables: normalizeArrayMetadata(row?.mapped_tables),
  mappedFields: normalizeArrayMetadata(row?.mapped_fields),
  applicationUsage: row?.application_usage || null,
  businessRules: row?.business_rules || null,
  objectSubObjectId: row?.object_sub_object_id || null,
  notes: row?.notes || null,
  createdAt: row?.created_at,
  updatedAt: row?.updated_at,
});

router.get('/object-table-map/:globalObjectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = String(req.query.subObjectId || '').trim();
    const result = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id,
              dd.notes, dd.mapped_tables, dd.mapped_fields, dd.application_usage, dd.business_rules,
              dd.created_at, dd.updated_at
       FROM data_definitions dd
       WHERE dd.global_object_id = $1
         AND ($2 = '' OR dd.object_sub_object_id::text = $2)
       ORDER BY dd.application_id ASC`,
      [req.params.globalObjectId, subObjectId]
    );

    res.json(formatListResponse(result.rows.map(formatMappingModel), result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/object-table-map', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { globalObjectId, applicationId, subObjectId, notes, mappedTables, mappedFields, applicationUsage, businessRules } = req.body || {};
    if (!globalObjectId || !applicationId) {
      throw new ApiError(400, 'globalObjectId and applicationId are required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO data_definitions (global_object_id, application_id, object_sub_object_id, notes, mapped_tables, mapped_fields, application_usage, business_rules)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       ON CONFLICT (global_object_id, application_id)
       DO UPDATE SET object_sub_object_id = EXCLUDED.object_sub_object_id,
                     notes = EXCLUDED.notes,
                     mapped_tables = EXCLUDED.mapped_tables,
                     mapped_fields = EXCLUDED.mapped_fields,
                     application_usage = EXCLUDED.application_usage,
                     business_rules = EXCLUDED.business_rules,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING id, global_object_id, application_id, object_sub_object_id, notes,
                 mapped_tables, mapped_fields, application_usage, business_rules, created_at, updated_at`,
      [globalObjectId, applicationId, subObjectId || null, notes || null, JSON.stringify(normalizeArrayMetadata(mappedTables)), JSON.stringify(normalizeArrayMetadata(mappedFields)), applicationUsage || null, businessRules || null]
    );

    res.status(201).json(formatSingleResponse(formatMappingModel(result.rows[0])));
  } catch (error) {
    next(error);
  }
});

router.get('/field-object-map/:definitionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT f.id, f.data_definition_id, f.sub_object_id, f.table_name, f.field_name, f.field_label,
              f.data_type, f.length, f.decimals, f.is_key, f.is_required, f.business_process_required, f.description, f.field_metadata, f.sort_order,
              f.created_at, f.updated_at
       FROM data_definition_fields f
       WHERE f.data_definition_id = $1
       ORDER BY f.sort_order ASC, f.field_name ASC`,
      [req.params.definitionId]
    );

    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/field-object-map/:definitionId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, businessProcessRequired, description, fieldMetadata, sortOrder } = req.body || {};
    if (!String(fieldName || '').trim()) {
      throw new ApiError(400, 'fieldName is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO data_definition_fields
         (data_definition_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, business_process_required, description, field_metadata, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.params.definitionId, tableName || null, String(fieldName).trim(), fieldLabel || null, dataType || null, length || null, decimals || null, isKey || false, isRequired || false, businessProcessRequired || false, description || null, fieldMetadata || {}, sortOrder || 0]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/field-object-map/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, businessProcessRequired, description, fieldMetadata, sortOrder } = req.body || {};
    const result = await db.query(
      `UPDATE data_definition_fields
       SET table_name = $1,
           field_name = $2,
           field_label = $3,
           data_type = $4,
           length = $5,
           decimals = $6,
           is_key = $7,
           is_required = $8,
           business_process_required = $9,
           description = $10,
           field_metadata = $11,
           sort_order = $12,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [tableName || null, fieldName || '', fieldLabel || null, dataType || null, length || null, decimals || null, isKey || false, isRequired || false, businessProcessRequired || false, description || null, fieldMetadata || {}, sortOrder || 0, req.params.fieldId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'Field not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/field-object-map/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM data_definition_fields WHERE id = $1', [req.params.fieldId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;