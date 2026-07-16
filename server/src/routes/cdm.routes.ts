import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
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
  const candidate = fenced?.[1] || trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
  if (!candidate || !candidate.trim().startsWith('{')) {
    throw new ApiError(502, 'AI response did not contain valid JSON', 'AI_INVALID_JSON');
  }

  try {
    return JSON.parse(candidate);
  } catch {
    throw new ApiError(502, 'AI response JSON could not be parsed', 'AI_INVALID_JSON');
  }
};

const normalizeProposalAttribute = (row: any, index: number) => ({
  id: String(row?.id || `proposal-attribute-${index}`),
  attributeName: String(row?.attributeName || row?.attribute_name || '').trim(),
  attributeDescription: row?.attributeDescription ?? row?.attribute_description ?? row?.description ?? '',
  dataType: row?.dataType ?? row?.data_type ?? '',
  length: row?.length === '' || row?.length == null ? null : Number(row.length),
  businessRules: row?.businessRules ?? row?.business_rules ?? '',
  sortOrder: Number(row?.sortOrder ?? row?.sort_order ?? index),
});

const normalizeProposalRelationship = (row: any, index: number) => ({
  id: String(row?.id || `proposal-relationship-${index}`),
  sourceAttributeId: row?.sourceAttributeId ?? row?.source_attribute_id ?? null,
  sourceAttributeName: String(row?.sourceAttributeName || row?.source_attribute_name || '').trim(),
  targetObjectName: String(row?.targetObjectName || row?.target_object_name || '').trim(),
  targetAttributeName: row?.targetAttributeName ?? row?.target_attribute_name ?? '',
  relationshipType: row?.relationshipType ?? row?.relationship_type ?? '',
  businessRules: row?.businessRules ?? row?.business_rules ?? '',
  sortOrder: Number(row?.sortOrder ?? row?.sort_order ?? index),
});

router.get('/:objectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = String(req.query.subObjectId || '').trim();
    const modelResult = await db.query(
      `SELECT id, global_object_id, object_sub_object_id, object_name, notes, created_at, updated_at
       FROM common_data_model
       WHERE global_object_id = $1
         AND (($2 = '' AND object_sub_object_id IS NULL) OR object_sub_object_id::text = $2)`,
      [req.params.objectId, subObjectId]
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
    const subObjectId = String(req.body?.subObjectId || req.query?.subObjectId || '').trim();
    const notes = req.body?.notes || null;
    const objectName = req.body?.objectName || null;
    const attributes = Array.isArray(req.body?.attributes) ? req.body.attributes : [];
    const relationships = Array.isArray(req.body?.relationships) ? req.body.relationships : [];

    await client.query('BEGIN');

    const existingModel = await client.query(
      `SELECT id, global_object_id, object_sub_object_id, object_name, notes, created_at, updated_at
       FROM common_data_model
       WHERE global_object_id = $1
         AND (($2 = '' AND object_sub_object_id IS NULL) OR object_sub_object_id::text = $2)`,
      [req.params.objectId, subObjectId]
    );

    let model: any;
    if (existingModel.rows.length) {
      const updatedModel = await client.query(
        `UPDATE common_data_model
         SET object_name = $1,
             notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, global_object_id, object_sub_object_id, object_name, notes, created_at, updated_at`,
        [objectName, notes, existingModel.rows[0].id]
      );
      model = updatedModel.rows[0];
    } else {
      const insertedModel = await client.query(
        `INSERT INTO common_data_model (global_object_id, object_sub_object_id, object_name, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, global_object_id, object_sub_object_id, object_name, notes, created_at, updated_at`,
        [req.params.objectId, subObjectId || null, objectName, notes]
      );
      model = insertedModel.rows[0];
    }

    await client.query('DELETE FROM cdm_relationships WHERE common_data_model_id = $1', [model.id]);
    await client.query('DELETE FROM cdm_attributes WHERE common_data_model_id = $1', [model.id]);

    const insertedAttributeIdsByName = new Map<string, string>();

    for (let i = 0; i < attributes.length; i += 1) {
      const row = attributes[i] || {};
      const attributeName = String(row.attributeName || '').trim();
      if (!attributeName) continue;

      const attributeResult = await client.query(
        `INSERT INTO cdm_attributes (
            common_data_model_id,
            attribute_name,
            attribute_description,
            data_type,
            length,
            business_rules,
            sort_order
          )
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, attribute_name`,
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

      const inserted = attributeResult.rows[0];
      if (inserted?.id && inserted?.attribute_name) {
        insertedAttributeIdsByName.set(String(inserted.attribute_name).trim().toLowerCase(), String(inserted.id));
      }
    }

    for (let i = 0; i < relationships.length; i += 1) {
      const row = relationships[i] || {};
      const sourceAttributeName = String(row.sourceAttributeName || '').trim();
      const targetObjectName = String(row.targetObjectName || '').trim();
      if (!sourceAttributeName || !targetObjectName) continue;

      const resolvedSourceAttributeId = insertedAttributeIdsByName.get(sourceAttributeName.toLowerCase()) || null;

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
          resolvedSourceAttributeId,
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

router.post('/:objectId/ai-proposal', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = String(req.body?.subObjectId || req.query?.subObjectId || '').trim() || null;
    if (!subObjectId) {
      throw new ApiError(400, 'subObjectId is required', 'MISSING_FIELD');
    }

    const objectResult = await db.query(
      `SELECT id, object_id, description, process_area, default_gateway_id, default_router_id
       FROM global_objects
       WHERE id = $1`,
      [req.params.objectId]
    );

    if (!objectResult.rows.length) {
      throw new ApiError(404, 'Object not found', 'NOT_FOUND');
    }

    const linkedDefinitionsResult = await db.query(
      `SELECT dd.id, dd.application_id, dd.global_object_id, dd.object_sub_object_id, dd.notes,
              a.name AS application_name, a.vendor, a.version
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       WHERE dd.global_object_id = $1
         AND dd.object_sub_object_id = $2
       ORDER BY a.name ASC`,
      [req.params.objectId, subObjectId]
    );

    if (!linkedDefinitionsResult.rows.length) {
      throw new ApiError(400, 'No linked application data definitions were found for this object', 'NO_DATA_DEFINITIONS');
    }

    const definitionIds = linkedDefinitionsResult.rows.map((row) => row.id);
    const subObjectsResult = await db.query(
      `SELECT id, data_definition_id, name, description, sort_order
       FROM data_definition_sub_objects
       WHERE data_definition_id = ANY($1::uuid[])
       ORDER BY sort_order ASC, name ASC`,
      [definitionIds]
    );
    const fieldsResult = await db.query(
      `SELECT id, data_definition_id, sub_object_id, table_name, field_name, field_label,
              data_type, length, decimals, is_key, is_required, business_process_required,
              description, field_metadata, sort_order
       FROM data_definition_fields
       WHERE data_definition_id = ANY($1::uuid[])
       ORDER BY sort_order ASC, field_name ASC`,
      [definitionIds]
    );

    const subObjectsByDefinition = new Map<string, any[]>();
    subObjectsResult.rows.forEach((row) => {
      const key = String(row.data_definition_id);
      const bucket = subObjectsByDefinition.get(key) || [];
      bucket.push(row);
      subObjectsByDefinition.set(key, bucket);
    });

    const fieldsByDefinition = new Map<string, any[]>();
    fieldsResult.rows.forEach((row) => {
      const key = String(row.data_definition_id);
      const bucket = fieldsByDefinition.get(key) || [];
      bucket.push(row);
      fieldsByDefinition.set(key, bucket);
    });

    const aggregatedSchema = linkedDefinitionsResult.rows.map((definition) => {
      const definitionId = String(definition.id);
      const allFields = fieldsByDefinition.get(definitionId) || [];
      return {
        id: definitionId,
        applicationId: definition.application_id,
        applicationName: definition.application_name,
        vendor: definition.vendor,
        version: definition.version,
        notes: definition.notes,
        subObjects: (subObjectsByDefinition.get(definitionId) || []).map((subObject) => ({
          id: subObject.id,
          name: subObject.name,
          description: subObject.description,
          sortOrder: subObject.sort_order,
          fields: allFields
            .filter((field) => field.sub_object_id === subObject.id)
            .map((field) => ({
              id: field.id,
              tableName: field.table_name,
              fieldName: field.field_name,
              fieldLabel: field.field_label,
              dataType: field.data_type,
              length: field.length,
              decimals: field.decimals,
              isKey: field.is_key,
              isRequired: field.is_required,
              businessProcessRequired: field.business_process_required,
              description: field.description,
              fieldMetadata: field.field_metadata || {},
              sortOrder: field.sort_order,
            })),
        })),
        rootFields: allFields
          .filter((field) => !field.sub_object_id)
          .map((field) => ({
            id: field.id,
            tableName: field.table_name,
            fieldName: field.field_name,
            fieldLabel: field.field_label,
            dataType: field.data_type,
            length: field.length,
            decimals: field.decimals,
            isKey: field.is_key,
            isRequired: field.is_required,
            businessProcessRequired: field.business_process_required,
            description: field.description,
            fieldMetadata: field.field_metadata || {},
            sortOrder: field.sort_order,
          })),
      };
    });

    const objectRow = objectResult.rows[0];
    const systemPrompt = [
      'You are designing a Common Data Model for an enterprise object based on application data definitions.',
      'Return JSON only with this shape:',
      '{',
      '  "attributes": [{ "attributeName": string, "attributeDescription": string, "dataType": string, "length": number|null, "businessRules": string }],',
      '  "relationships": [{ "sourceAttributeName": string, "targetObjectName": string, "targetAttributeName": string, "relationshipType": string, "businessRules": string }]',
      '}',
      'Do not include markdown, commentary, or extra keys.',
      'Consolidate duplicate application fields into canonical enterprise attributes, preserve important business rules, and infer useful relationships between the object and dependent targets.',
    ].join('\n');

    const userPrompt = [
      `Object ID: ${objectRow.object_id}`,
      `Object Description: ${objectRow.description || ''}`,
      `Process Area: ${objectRow.process_area || ''}`,
      '',
      'Application data definition schema:',
      JSON.stringify(aggregatedSchema, null, 2),
    ].join('\n');

    const executionResult = await aiExecutionService.execute({
      gatewayId: objectRow.default_gateway_id || undefined,
      routerId: objectRow.default_router_id || undefined,
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

    const attributes = Array.isArray(parsed?.attributes)
      ? parsed.attributes.map((row: any, index: number) => normalizeProposalAttribute(row, index)).filter((row: any) => row.attributeName)
      : [];
    const relationships = Array.isArray(parsed?.relationships)
      ? parsed.relationships.map((row: any, index: number) => normalizeProposalRelationship(row, index)).filter((row: any) => row.sourceAttributeName && row.targetObjectName)
      : [];

    res.json(formatSingleResponse({
      attributes,
      relationships,
      sourceSchema: aggregatedSchema,
      usage: executionResult?.usage || null,
      selection: executionResult?.selection || null,
    }));
  } catch (error) {
    next(error);
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
