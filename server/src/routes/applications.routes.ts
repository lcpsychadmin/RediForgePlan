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

const extractBalancedSegment = (input: string, openChar: '[' | '{', closeChar: ']' | '}') => {
  const start = input.indexOf(openChar);
  if (start < 0) {
    return '';
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return '';
};

const unwrapProposalEnvelope = (parsed: any) => {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const directKeys = ['proposals', 'fields', 'data', 'results', 'items'];
  for (const key of directKeys) {
    if (Array.isArray((parsed as any)[key])) {
      return (parsed as any)[key];
    }
  }

  if (parsed.data && typeof parsed.data === 'object') {
    for (const key of directKeys) {
      if (Array.isArray((parsed.data as any)[key])) {
        return (parsed.data as any)[key];
      }
    }
  }

  return null;
};

const recoverPartialArray = (input: string) => {
  const source = String(input || '').trim();
  if (!source.startsWith('[')) {
    return null;
  }

  let inString = false;
  let escaped = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let lastTopLevelObjectEnd = -1;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[') {
      bracketDepth += 1;
      continue;
    }

    if (ch === ']') {
      bracketDepth -= 1;
      continue;
    }

    if (ch === '{') {
      braceDepth += 1;
      continue;
    }

    if (ch === '}') {
      braceDepth -= 1;
      if (braceDepth === 0 && bracketDepth === 1) {
        lastTopLevelObjectEnd = i;
      }
    }
  }

  if (lastTopLevelObjectEnd < 0) {
    return null;
  }

  const recovered = `${source.slice(0, lastTopLevelObjectEnd + 1)}]`;
  try {
    const parsed = JSON.parse(recovered);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseAiJson = (text: string) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new ApiError(502, 'AI response did not contain any content', 'AI_EMPTY_RESPONSE');
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  const normalizedFenced = fenced?.[1] ? String(fenced[1]).replace(/^json\s*/i, '').trim() : '';

  const candidates = [
    trimmed,
    normalizedFenced,
    extractBalancedSegment(trimmed, '[', ']'),
    extractBalancedSegment(normalizedFenced, '[', ']'),
    extractBalancedSegment(trimmed, '{', '}'),
    extractBalancedSegment(normalizedFenced, '{', '}'),
  ].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const unwrapped = unwrapProposalEnvelope(parsed);
      if (Array.isArray(unwrapped)) {
        return unwrapped;
      }
    } catch {
      // Try the next candidate form.
    }

    const recovered = recoverPartialArray(candidate);
    if (Array.isArray(recovered) && recovered.length > 0) {
      return recovered;
    }
  }

  throw new ApiError(502, 'AI response JSON could not be parsed', 'AI_INVALID_JSON');
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

const compactMetadataContext = (fields: any[]) => {
  const limited = Array.isArray(fields) ? fields.slice(0, 120) : [];
  return limited.map((field) => ({
    field_name: field?.field_name || null,
    field_label: field?.field_label || null,
    data_type: field?.data_type || null,
    length: field?.length ?? null,
    decimals: field?.decimals ?? null,
    is_key: !!field?.is_key,
    is_required: !!field?.is_required,
    table_name: field?.field_metadata?.tableName || field?.field_metadata?.table || null,
    source_type: field?.field_metadata?.sourceType || null,
    sort_order: field?.sort_order ?? null,
  }));
};

const proposalKey = (row: any) => {
  const tableName = String(row?.tableName || row?.table || '').trim().toLowerCase();
  const fieldName = String(row?.fieldName || row?.field_name || '').trim().toLowerCase();
  return `${tableName}::${fieldName}`;
};

const mergeUniqueProposals = (first: any[], second: any[]) => {
  const merged: any[] = [];
  const seen = new Set<string>();
  for (const row of [...(first || []), ...(second || [])]) {
    const key = proposalKey(row);
    if (!key || key.endsWith('::')) {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(row);
  }
  return merged;
};

const countByTable = (rows: any[]) => {
  const counts = new Map<string, number>();
  for (const row of rows || []) {
    const table = String(row?.tableName || row?.table || '').trim().toUpperCase();
    if (!table) {
      continue;
    }
    counts.set(table, (counts.get(table) || 0) + 1);
  }
  return counts;
};

const isProviderTimeoutError = (error: any) => {
  return error instanceof ApiError && error.code === 'AI_PROVIDER_TIMEOUT';
};

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
      'You are enhancing the AI prompt for the data definition for the selected Data Object, Sub-object, and Application inside RediForge.',
      'Your task: Return the FULL physical table definition for the selected application and sub-object, including ALL fields from ALL relevant tables.',
      '',
      'Context you must use:',
      '- Data Object',
      '- Sub-object (if null, treat the Data Object as the sub-object)',
      '- Application',
      '- Process Area',
      '- Include ALL fields from ALL tables related to this sub-object/application',
      '- Include technical, audit, system, reference, and relationship fields',
      '- Include fields even if rarely used',
      '- Do NOT invent table names; infer from application conventions or industry documentation',
      '- If Databricks metadata is available, use it as grounding',
      '- If application-native metadata exists, use it as grounding',
      '- If CDM attributes exist, use them to infer missing fields',
      '',
      'Output format:',
      'Return JSON only as an array of field objects with this exact shape:',
      '[{"fieldName":string,"label":string,"tableName":string,"fieldDescription":string,"applicationUsage":string,"businessDefinition":string,"businessRules":string,"fieldType":string,"fieldLength":number|null,"decimalPlaces":number|null,"systemRequired":boolean,"businessProcessRequired":boolean,"suppressedField":boolean,"legalRegulatoryImplications":string,"securityClassification":string,"referenceTable":string,"groupingTab":string,"piiType":string,"securityControls":string}]',
      '',
      'Goal: Return the COMPLETE list of fields for this application/sub-object, not a semantic subset.',
      'Do not include markdown, prose, comments, or extra wrapper keys.',
      'Prefer grounded tableName values from provided metadata; when unknown, return an empty string for tableName.',
      'Keep fieldName unique per tableName when possible.',
      'Prioritize field coverage over verbose descriptions.',
      'Keep narrative fields concise; if uncertain, return empty strings for optional narrative attributes.',
    ].join('\n');

    const compactFields = compactMetadataContext(fieldsResult.rows);
    const compactCdmAttributes = (cdmAttributes || []).slice(0, 80);
    const compactCdmRelationships = (cdmRelationships || []).slice(0, 80);

    const userPrompt = [
      `Data Object: ${definition.object_id}`,
      `Sub-object: ${definition.sub_object_name || 'null'} (if null, treat Data Object "${definition.object_id}" as the sub-object)`,
      `Application: ${definition.application_name}`,
      `Process Area: ${definition.process_area || ''}`,
      `Application Vendor: ${definition.vendor || ''}`,
      `Application Version: ${definition.version || ''}`,
      `Data Object Description: ${definition.object_description || ''}`,
      '',
      'Grounded metadata sample (existing data definition fields):',
      JSON.stringify(compactFields, null, 2),
      '',
      'CDM attributes for inference of missing fields:',
      JSON.stringify(compactCdmAttributes, null, 2),
      '',
      'CDM relationships for reference and relationship field inference:',
      JSON.stringify(compactCdmRelationships, null, 2),
      '',
      'Instruction: Return the COMPLETE field list for all relevant tables in this application/sub-object scope.',
    ].join('\n');

    const runAiProposal = async (maxTokens: number, timeoutMs: number) => aiExecutionService.execute({
      gatewayId: definition.default_gateway_id || undefined,
      routerId: definition.default_router_id || undefined,
      payload: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens,
        timeoutMs,
      },
    });

    let executionResult;
    try {
      executionResult = await runAiProposal(800, 20000);
    } catch (error) {
      if (!isProviderTimeoutError(error)) {
        throw error;
      }
      executionResult = await runAiProposal(450, 12000);
    }

    const aiText = extractAiText(executionResult);
    const parsed = parseAiJson(aiText);
    const firstPassProposals = Array.isArray(parsed)
      ? parsed.map((row: any, index: number) => normalizeAiFieldProposal(row, index)).filter((row: any) => row.fieldName)
      : [];

    const discoveredTables = Array.from(new Set([
      ...firstPassProposals.map((row: any) => String(row.tableName || row.table || '').trim()).filter(Boolean),
      ...compactFields.map((row: any) => String(row.table_name || '').trim()).filter(Boolean),
    ])).slice(0, 8);

    let proposals = firstPassProposals;

    if (discoveredTables.length > 0 && firstPassProposals.length < 30) {
      const expansionUserPrompt = [
        `Data Object: ${definition.object_id}`,
        `Sub-object: ${definition.sub_object_name || definition.object_id}`,
        `Application: ${definition.application_name}`,
        `Target tables: ${discoveredTables.join(', ')}`,
        '',
        'Existing fields already proposed (do not repeat these):',
        JSON.stringify(firstPassProposals.map((row: any) => ({ tableName: row.tableName || row.table || '', fieldName: row.fieldName })), null, 2),
        '',
        'Return ADDITIONAL missing fields only for the target tables.',
        'Prioritize standard operational, status, address, tax, credit, sales area, company code, audit, and integration fields.',
        'Keep descriptions concise so you can return many fields.',
      ].join('\n');

      try {
        const expansionResult = await aiExecutionService.execute({
          gatewayId: definition.default_gateway_id || undefined,
          routerId: definition.default_router_id || undefined,
          payload: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: expansionUserPrompt },
            ],
            temperature: 0.1,
            maxTokens: 650,
            timeoutMs: 7000,
          },
        });

        const expansionParsed = parseAiJson(extractAiText(expansionResult));
        const secondPassProposals = Array.isArray(expansionParsed)
          ? expansionParsed.map((row: any, index: number) => normalizeAiFieldProposal(row, index + firstPassProposals.length)).filter((row: any) => row.fieldName)
          : [];

        proposals = mergeUniqueProposals(firstPassProposals, secondPassProposals);
      } catch (error) {
        if (!isProviderTimeoutError(error)) {
          throw error;
        }
        // If enrichment times out, still return first-pass proposals.
      }
    }

    // Table-level enrichment pass: if important tables still have thin coverage, request additional missing fields per table.
    const tableCounts = countByTable(proposals);
    const minFieldsPerTable = 24;
    const thinTables = discoveredTables
      .map((table) => String(table || '').trim().toUpperCase())
      .filter(Boolean)
      .filter((table) => (tableCounts.get(table) || 0) < minFieldsPerTable)
      .slice(0, 2);

    for (const tableName of thinTables) {
      const existingForTable = proposals
        .filter((row: any) => String(row.tableName || row.table || '').trim().toUpperCase() === tableName)
        .map((row: any) => String(row.fieldName || '').trim())
        .filter(Boolean);

      const needed = Math.max(10, minFieldsPerTable - existingForTable.length);
      const tableExpansionPrompt = [
        `Data Object: ${definition.object_id}`,
        `Application: ${definition.application_name}`,
        `Target table: ${tableName}`,
        `Need at least ${needed} ADDITIONAL missing fields for this table.`,
        '',
        'Existing fields already captured for this table (do not repeat):',
        JSON.stringify(existingForTable, null, 2),
        '',
        'Return only additional fields for this table.',
        'Use concise output to maximize field count.',
        'Allowed brevity rule: keep label = fieldName and optional narrative fields empty when needed.',
      ].join('\n');

      try {
        const tableResult = await aiExecutionService.execute({
          gatewayId: definition.default_gateway_id || undefined,
          routerId: definition.default_router_id || undefined,
          payload: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: tableExpansionPrompt },
            ],
            temperature: 0.1,
            maxTokens: 650,
            timeoutMs: 6500,
          },
        });

        const tableParsed = parseAiJson(extractAiText(tableResult));
        const tableProposals = Array.isArray(tableParsed)
          ? tableParsed
            .map((row: any, index: number) => normalizeAiFieldProposal(row, index + proposals.length))
            .filter((row: any) => row.fieldName)
            .map((row: any) => ({ ...row, tableName: row.tableName || tableName, table: row.table || tableName }))
          : [];

        proposals = mergeUniqueProposals(proposals, tableProposals);
      } catch (error) {
        if (!isProviderTimeoutError(error)) {
          throw error;
        }
        // Keep current proposals if table-level enrichment times out.
      }
    }

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
