// server/src/routes/applications.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';

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
    const result = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.notes, dd.created_at, dd.updated_at,
              a.name as application_name, a.vendor, a.version
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       WHERE dd.global_object_id = $1
       ORDER BY a.name ASC`,
      [req.params.globalObjectId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

// Create a data definition (link object to application)
router.post('/data-definitions', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { globalObjectId, applicationId, notes } = req.body;
    if (!globalObjectId || !applicationId) throw new ApiError(400, 'globalObjectId and applicationId are required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO data_definitions (global_object_id, application_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (global_object_id, application_id) DO UPDATE SET notes=EXCLUDED.notes, updated_at=CURRENT_TIMESTAMP
       RETURNING id, global_object_id, application_id, notes, created_at, updated_at`,
      [globalObjectId, applicationId, notes || null]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes } = req.body;
    const result = await db.query(
      `UPDATE data_definitions SET notes=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2
       RETURNING id, global_object_id, application_id, notes, created_at, updated_at`,
      [notes || null, req.params.id]
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
      `SELECT id, data_definition_id, table_name, field_name, field_label, data_type,
              length, decimals, is_key, is_required, description, sort_order, created_at, updated_at
       FROM data_definition_fields
       WHERE data_definition_id = $1
       ORDER BY sort_order ASC, field_name ASC`,
      [req.params.definitionId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (err) { next(err); }
});

router.post('/data-definitions/:definitionId/fields', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, description, sortOrder } = req.body;
    if (!fieldName?.trim()) throw new ApiError(400, 'fieldName is required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO data_definition_fields
         (data_definition_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, description, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.params.definitionId, tableName || null, fieldName.trim(), fieldLabel || null, dataType || null,
       length || null, decimals || null, isKey || false, isRequired || false, description || null, sortOrder || 0]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/fields/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, description, sortOrder } = req.body;
    const result = await db.query(
      `UPDATE data_definition_fields
       SET table_name=$1, field_name=$2, field_label=$3, data_type=$4, length=$5, decimals=$6,
           is_key=$7, is_required=$8, description=$9, sort_order=$10, updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING *`,
      [tableName || null, fieldName || '', fieldLabel || null, dataType || null,
       length || null, decimals || null, isKey || false, isRequired || false, description || null, sortOrder || 0, req.params.fieldId]
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

export default router;
