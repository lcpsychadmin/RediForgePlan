// server/src/routes/applications.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import databricksMetadataService from '../services/databricksMetadataService.js';

const router = Router();

// ── Applications ─────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT id, name, description, vendor, version, is_active, created_at, updated_at
       FROM applications ORDER BY name ASC`
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, vendor, version } = req.body;
    if (!name?.trim()) throw new ApiError(400, 'Application name is required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO applications (name, description, vendor, version)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, vendor, version, is_active, created_at, updated_at`,
      [name.trim(), description || null, vendor || null, version || null]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, vendor, version, isActive } = req.body;
    const result = await db.query(
      `UPDATE applications SET name=$1, description=$2, vendor=$3, version=$4, is_active=$5, updated_at=CURRENT_TIMESTAMP
       WHERE id=$6
       RETURNING id, name, description, vendor, version, is_active, created_at, updated_at`,
      [name?.trim() || '', description || null, vendor || null, version || null, isActive !== false, req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
    res.json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Data Definitions (object ↔ application) ───────────────────────────────────

// List all data definitions for a global object (with application info)
router.get('/data-definitions/object/:globalObjectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = String(req.query.subObjectId || '').trim() || null;
    const result = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id, dd.notes, dd.created_at, dd.updated_at,
              a.name as application_name, a.vendor, a.version,
              oso.name as sub_object_name
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       LEFT JOIN object_sub_objects oso ON oso.id = dd.object_sub_object_id
       WHERE dd.global_object_id = $1
         AND ($2::uuid IS NULL OR dd.object_sub_object_id = $2)
       ORDER BY a.name ASC`,
      [req.params.globalObjectId, subObjectId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

// Create a data definition (link object to application)
router.post('/data-definitions', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { globalObjectId, applicationId, subObjectId, notes } = req.body;
    if (!globalObjectId || !applicationId || !subObjectId) throw new ApiError(400, 'globalObjectId, applicationId, and subObjectId are required', 'MISSING_FIELD');

    const existing = await db.query(
      `SELECT id, global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at
       FROM data_definitions
       WHERE global_object_id = $1 AND application_id = $2 AND object_sub_object_id = $3`,
      [globalObjectId, applicationId, subObjectId]
    );

    if (existing.rows.length) {
      const updated = await db.query(
        `UPDATE data_definitions
         SET notes = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at`,
        [notes || null, existing.rows[0].id]
      );
      res.status(201).json(formatSingleResponse(updated.rows[0]));
      return;
    }

    const result = await db.query(
      `INSERT INTO data_definitions (global_object_id, application_id, object_sub_object_id, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at`,
      [globalObjectId, applicationId, subObjectId, notes || null]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes, subObjectId } = req.body;
    const result = await db.query(
      `UPDATE data_definitions SET notes=$1, object_sub_object_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3
       RETURNING id, global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at`,
      [notes || null, subObjectId || null, req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Data definition not found', 'NOT_FOUND');
    res.json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.delete('/data-definitions/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM data_definitions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Data Definition Fields ────────────────────────────────────────────────────

router.get('/data-definitions/:definitionId/fields', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT f.id, f.data_definition_id, f.sub_object_id, f.table_name, f.field_name, f.field_label,
              f.data_type, f.length, f.decimals, f.is_key, f.is_required, f.business_process_required, f.description, f.field_metadata, f.sort_order,
              f.created_at, f.updated_at,
              s.name as sub_object_name
       FROM data_definition_fields f
       LEFT JOIN data_definition_sub_objects s ON s.id = f.sub_object_id
       WHERE f.data_definition_id = $1
       ORDER BY COALESCE(s.sort_order, -1) ASC, f.sort_order ASC, f.field_name ASC`,
      [req.params.definitionId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

router.post('/data-definitions/:definitionId/fields', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, businessProcessRequired, description, fieldMetadata, sortOrder, subObjectId } = req.body;
    if (!fieldName?.trim()) throw new ApiError(400, 'fieldName is required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO data_definition_fields
         (data_definition_id, sub_object_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, business_process_required, description, field_metadata, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.params.definitionId, subObjectId || null, tableName || null, fieldName.trim(), fieldLabel || null, dataType || null,
       length || null, decimals || null, isKey || false, isRequired || false, businessProcessRequired || false, description || null, fieldMetadata || {}, sortOrder || 0]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/fields/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, businessProcessRequired, description, fieldMetadata, sortOrder, subObjectId } = req.body;
    const result = await db.query(
      `UPDATE data_definition_fields
       SET sub_object_id=$1, table_name=$2, field_name=$3, field_label=$4, data_type=$5, length=$6, decimals=$7,
           is_key=$8, is_required=$9, business_process_required=$10, description=$11, field_metadata=$12, sort_order=$13, updated_at=CURRENT_TIMESTAMP
         WHERE id=$14 RETURNING *`,
      [subObjectId || null, tableName || null, fieldName || '', fieldLabel || null, dataType || null,
         length || null, decimals || null, isKey || false, isRequired || false, businessProcessRequired || false, description || null, fieldMetadata || {}, sortOrder || 0, req.params.fieldId]
    );
    if (!result.rows.length) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
    res.json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.delete('/data-definitions/fields/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM data_definition_fields WHERE id=$1', [req.params.fieldId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/data-definitions/:definitionId/metadata-sync', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { catalog, schema, table, subObjectId } = req.body || {};
    if (!catalog || !schema || !table) {
      throw new ApiError(400, 'catalog, schema, and table are required', 'MISSING_FIELD');
    }

    const metadata = await databricksMetadataService.fetchTableMetadata(String(catalog), String(schema), String(table));
    const mappedFields = databricksMetadataService.mapMetadataToFieldDefinitions(metadata);

    if (subObjectId) {
      await db.query(
        'DELETE FROM data_definition_fields WHERE data_definition_id = $1 AND sub_object_id = $2',
        [req.params.definitionId, subObjectId]
      );
    } else {
      await db.query('DELETE FROM data_definition_fields WHERE data_definition_id = $1 AND sub_object_id IS NULL', [req.params.definitionId]);
    }

    for (const field of mappedFields) {
      await db.query(
        `INSERT INTO data_definition_fields
           (data_definition_id, sub_object_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, business_process_required, description, field_metadata, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          req.params.definitionId,
          subObjectId || null,
          field.tableName,
          field.fieldName,
          field.fieldLabel,
          field.dataType,
          field.length,
          field.decimals,
          field.isKey,
          field.isRequired,
          field.businessProcessRequired,
          field.description,
          {
            ...(field.fieldMetadata || {}),
            metadataSync: {
              source: 'databricks',
              catalog: String(catalog),
              schema: String(schema),
              table: String(table),
              subObjectId: subObjectId || null,
              syncedAt: new Date().toISOString(),
            },
          },
          field.sortOrder,
        ]
      );
    }

    const updatedFields = await db.query(
      `SELECT f.id, f.data_definition_id, f.sub_object_id, f.table_name, f.field_name, f.field_label,
              f.data_type, f.length, f.decimals, f.is_key, f.is_required, f.business_process_required, f.description, f.field_metadata, f.sort_order,
              f.created_at, f.updated_at,
              s.name as sub_object_name
       FROM data_definition_fields f
       LEFT JOIN data_definition_sub_objects s ON s.id = f.sub_object_id
       WHERE f.data_definition_id = $1
       ORDER BY COALESCE(s.sort_order, -1) ASC, f.sort_order ASC, f.field_name ASC`,
      [req.params.definitionId]
    );

    res.json(formatSingleResponse({
      syncedAt: new Date().toISOString(),
      source: { catalog: String(catalog), schema: String(schema), table: String(table), subObjectId: subObjectId || null },
      fields: updatedFields.rows,
    }));
  } catch (err) { next(err); }
});

// ── Sub-objects ───────────────────────────────────────────────────────────────

router.get('/data-definitions/:definitionId/sub-objects', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT id, data_definition_id, name, description, sort_order, created_at, updated_at
       FROM data_definition_sub_objects
       WHERE data_definition_id = $1
       ORDER BY sort_order ASC, name ASC`,
      [req.params.definitionId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

router.post('/data-definitions/:definitionId/sub-objects', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, sortOrder } = req.body;
    if (!name?.trim()) throw new ApiError(400, 'Sub-object name is required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO data_definition_sub_objects (data_definition_id, name, description, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.definitionId, name.trim(), description || null, sortOrder || 0]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/sub-objects/:subObjectId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, sortOrder } = req.body;
    const result = await db.query(
      `UPDATE data_definition_sub_objects SET name=$1, description=$2, sort_order=$3, updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [name || '', description || null, sortOrder || 0, req.params.subObjectId]
    );
    if (!result.rows.length) throw new ApiError(404, 'Sub-object not found', 'NOT_FOUND');
    res.json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.delete('/data-definitions/sub-objects/:subObjectId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM data_definition_sub_objects WHERE id=$1', [req.params.subObjectId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
