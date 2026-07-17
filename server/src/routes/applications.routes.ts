// server/src/routes/applications.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import databricksMetadataService from '../services/databricksMetadataService.js';
import aiExecutionService from '../services/aiExecutionService.js';

const router = Router();

const extractAiText = (executionResult: any): string => {
  const content = executionResult?.result?.response?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (typeof executionResult?.result?.message === 'string') {
    return executionResult.result.message;
  }
  return '';
};

const parseAiJson = (text: string) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new ApiError(502, 'AI response did not contain any content', 'AI_EMPTY_RESPONSE');
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || trimmed.slice(trimmed.indexOf('['), trimmed.lastIndexOf(']') + 1) || trimmed;
  if (!candidate || !candidate.trim().startsWith('[')) {
    throw new ApiError(502, 'AI response did not contain valid JSON array', 'AI_INVALID_JSON');
  }

  try {
    return JSON.parse(candidate);
  } catch {
    throw new ApiError(502, 'AI response JSON could not be parsed', 'AI_INVALID_JSON');
  }
};

const normalizeAiFieldProposal = (row: any, index: number) => ({
  id: String(row?.id || `ai-field-${index}`),
  fieldName: String(row?.fieldName || row?.field_name || '').trim(),
  label: String(row?.label || row?.fieldLabel || row?.field_label || '').trim(),
  table: String(row?.table || row?.tableName || row?.table_name || '').trim(),
  tableName: String(row?.tableName || row?.table_name || '').trim(),
  fieldDescription: String(row?.fieldDescription || row?.field_description || row?.description || '').trim(),
  applicationUsage: String(row?.applicationUsage || row?.application_usage || '').trim(),
  businessDefinition: String(row?.businessDefinition || row?.business_definition || '').trim(),
  businessRules: String(row?.businessRules || row?.business_rules || '').trim(),
  fieldType: String(row?.fieldType || row?.field_type || row?.dataType || row?.data_type || '').trim(),
  fieldLength: row?.fieldLength === '' || row?.fieldLength == null ? (row?.length === '' || row?.length == null ? null : Number(row.length)) : Number(row.fieldLength),
  decimalPlaces: row?.decimalPlaces === '' || row?.decimalPlaces == null ? (row?.decimals === '' || row?.decimals == null ? null : Number(row.decimals)) : Number(row.decimalPlaces),
  systemRequired: !!(row?.systemRequired ?? row?.system_required ?? row?.isRequired),
  businessProcessRequired: !!(row?.businessProcessRequired ?? row?.business_process_required),
  suppressedField: !!(row?.suppressedField ?? row?.suppressed_field),
  legalRegulatoryImplications: String(row?.legalRegulatoryImplications || row?.legal_regulatory_implications || '').trim(),
  securityClassification: String(row?.securityClassification || row?.security_classification || '').trim(),
  referenceTable: String(row?.referenceTable || row?.reference_table || '').trim(),
  groupingTab: String(row?.groupingTab || row?.grouping_tab || '').trim(),
  piiType: String(row?.piiType || row?.pii_type || '').trim(),
  securityControls: String(row?.securityControls || row?.security_controls || '').trim(),
});

const resolveLegacyFieldSubObjectId = async (definitionId: string, subObjectId: string | null | undefined) => {
  const trimmed = String(subObjectId || '').trim();
  if (!trimmed) {
    return null;
  }

  const result = await db.query(
    `SELECT id
     FROM data_definition_sub_objects
     WHERE id = $1 AND data_definition_id = $2`,
    [trimmed, definitionId]
  );

  return result.rows.length ? trimmed : null;
};

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
    const subObjectId = String(req.query.subObjectId || '').trim();
    const result = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id, dd.notes, dd.created_at, dd.updated_at,
              a.name as application_name, a.vendor, a.version,
              oso.name as sub_object_name
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       LEFT JOIN object_sub_objects oso ON oso.id = dd.object_sub_object_id
       WHERE dd.global_object_id = $1
         AND ($2 = '' OR dd.object_sub_object_id::text = $2)
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
    if (!globalObjectId || !applicationId) throw new ApiError(400, 'globalObjectId and applicationId are required', 'MISSING_FIELD');

    const existing = await db.query(
      `SELECT id, global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at
       FROM data_definitions
       WHERE global_object_id = $1 AND application_id = $2 AND object_sub_object_id = $3`,
      [globalObjectId, applicationId, subObjectId || null]
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
      [globalObjectId, applicationId, subObjectId || null, notes || null]
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
    const resolvedSubObjectId = await resolveLegacyFieldSubObjectId(req.params.definitionId, subObjectId);
    const result = await db.query(
      `INSERT INTO data_definition_fields
         (data_definition_id, sub_object_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, business_process_required, description, field_metadata, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.params.definitionId, resolvedSubObjectId, tableName || null, fieldName.trim(), fieldLabel || null, dataType || null,
       length || null, decimals || null, isKey || false, isRequired || false, businessProcessRequired || false, description || null, fieldMetadata || {}, sortOrder || 0]
    );
    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (err) { next(err); }
});

router.put('/data-definitions/fields/:fieldId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName, fieldName, fieldLabel, dataType, length, decimals, isKey, isRequired, businessProcessRequired, description, fieldMetadata, sortOrder, subObjectId } = req.body;
    const definitionResult = await db.query(
      `SELECT data_definition_id FROM data_definition_fields WHERE id = $1`,
      [req.params.fieldId]
    );
    const definitionId = definitionResult.rows[0]?.data_definition_id ? String(definitionResult.rows[0].data_definition_id) : '';
    const resolvedSubObjectId = definitionId
      ? await resolveLegacyFieldSubObjectId(definitionId, subObjectId)
      : null;
    const result = await db.query(
      `UPDATE data_definition_fields
       SET sub_object_id=$1, table_name=$2, field_name=$3, field_label=$4, data_type=$5, length=$6, decimals=$7,
           is_key=$8, is_required=$9, business_process_required=$10, description=$11, field_metadata=$12, sort_order=$13, updated_at=CURRENT_TIMESTAMP
         WHERE id=$14 RETURNING *`,
      [resolvedSubObjectId, tableName || null, fieldName || '', fieldLabel || null, dataType || null,
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
    const resolvedSubObjectId = await resolveLegacyFieldSubObjectId(req.params.definitionId, subObjectId || null);

    if (resolvedSubObjectId) {
      await db.query(
        `DELETE FROM data_definition_fields
         WHERE data_definition_id = $1
           AND sub_object_id = $2
           AND (
             field_metadata->>'sourceType' = 'databricks'
             OR field_metadata ? 'metadataSync'
           )`,
        [req.params.definitionId, resolvedSubObjectId]
      );
    } else {
      await db.query(
        `DELETE FROM data_definition_fields
         WHERE data_definition_id = $1
           AND sub_object_id IS NULL
           AND (
             field_metadata->>'sourceType' = 'databricks'
             OR field_metadata ? 'metadataSync'
           )`,
        [req.params.definitionId]
      );
    }

    for (const field of mappedFields) {
      await db.query(
        `INSERT INTO data_definition_fields
           (data_definition_id, sub_object_id, table_name, field_name, field_label, data_type, length, decimals, is_key, is_required, business_process_required, description, field_metadata, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          req.params.definitionId,
          resolvedSubObjectId,
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
            sourceType: 'databricks',
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

router.post('/data-definitions/:definitionId/ai-generate-fields', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const definitionResult = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id,
              go.object_id, go.description AS object_description, go.process_area,
              go.default_gateway_id, go.default_router_id,
              app.name AS application_name, app.vendor, app.version,
              so.name AS sub_object_name,
              cdm.id AS cdm_id
       FROM data_definitions dd
       JOIN global_objects go ON go.id = dd.global_object_id
       JOIN applications app ON app.id = dd.application_id
       LEFT JOIN object_sub_objects so ON so.id = dd.object_sub_object_id
       LEFT JOIN common_data_model cdm
         ON cdm.global_object_id = dd.global_object_id
        AND ((dd.object_sub_object_id IS NULL AND cdm.object_sub_object_id IS NULL) OR cdm.object_sub_object_id = dd.object_sub_object_id)
       WHERE dd.id = $1`,
      [req.params.definitionId]
    );

    if (!definitionResult.rows.length) {
      throw new ApiError(404, 'Data definition not found', 'NOT_FOUND');
    }

    const definition = definitionResult.rows[0];
    const fieldsResult = await db.query(
      `SELECT id, field_name, field_label, data_type, length, decimals, is_key, is_required, description, field_metadata, sort_order
       FROM data_definition_fields
       WHERE data_definition_id = $1
       ORDER BY sort_order ASC, field_name ASC`,
      [req.params.definitionId]
    );

    let cdmAttributes: any[] = [];
    let cdmRelationships: any[] = [];
    if (definition.cdm_id) {
      const [attrResult, relResult] = await Promise.all([
        db.query(
          `SELECT attribute_name, attribute_description, data_type, length, business_rules, sort_order
           FROM cdm_attributes
           WHERE common_data_model_id = $1
           ORDER BY sort_order ASC, attribute_name ASC`,
          [definition.cdm_id]
        ),
        db.query(
          `SELECT source_attribute_name, target_object_name, target_attribute_name, relationship_type, business_rules, sort_order
           FROM cdm_relationships
           WHERE common_data_model_id = $1
           ORDER BY sort_order ASC, target_object_name ASC`,
          [definition.cdm_id]
        ),
      ]);
      cdmAttributes = attrResult.rows;
      cdmRelationships = relResult.rows;
    }

    const systemPrompt = [
      'You are an enterprise data architect generating application-specific data definition fields.',
      'Respect this hierarchy: Data Object -> Sub Object -> Application -> Data Definition.',
      'Use context from CDM attributes, relationships, and existing fields.',
      'Incorporate industry-standard schema conventions for ERP applications such as SAP, JDE, and Workday when relevant.',
      'Return JSON only as an array of fields with keys:',
      '[{"fieldName":string,"label":string,"table":string,"tableName":string,"fieldDescription":string,"applicationUsage":string,"businessDefinition":string,"businessRules":string,"fieldType":string,"fieldLength":number|null,"decimalPlaces":number|null,"systemRequired":boolean,"businessProcessRequired":boolean,"suppressedField":boolean,"legalRegulatoryImplications":string,"securityClassification":string,"referenceTable":string,"groupingTab":string,"piiType":string,"securityControls":string}]',
      'Produce all metadata fields and keep them non-empty when you can infer them from the application and CDM context.',
      'Include both table and tableName. If unknown, return them as empty strings.',
      'Do not include markdown or commentary.',
      'Return between 8 and 25 high-value fields.',
    ].join('\n');

    const userPrompt = [
      `Data Object: ${definition.object_id}`,
      `Sub Object: ${definition.sub_object_name || 'Root'}`,
      `Application: ${definition.application_name}`,
      `Application Vendor: ${definition.vendor || ''}`,
      `Application Version: ${definition.version || ''}`,
      `Process Area: ${definition.process_area || ''}`,
      `Data Object Description: ${definition.object_description || ''}`,
      '',
      'Existing Data Definition Fields:',
      JSON.stringify(fieldsResult.rows, null, 2),
      '',
      'Existing CDM Attributes:',
      JSON.stringify(cdmAttributes, null, 2),
      '',
      'Existing CDM Relationships:',
      JSON.stringify(cdmRelationships, null, 2),
    ].join('\n');

    const executionResult = await aiExecutionService.execute({
      gatewayId: definition.default_gateway_id || undefined,
      routerId: definition.default_router_id || undefined,
      payload: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      },
    });

    const aiText = extractAiText(executionResult);
    const parsed = parseAiJson(aiText);
    const proposals = Array.isArray(parsed)
      ? parsed.map((row: any, index: number) => normalizeAiFieldProposal(row, index)).filter((row: any) => row.fieldName)
      : [];

    res.json(formatSingleResponse({
      proposals,
      usage: executionResult?.usage || null,
      selection: executionResult?.selection || null,
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
