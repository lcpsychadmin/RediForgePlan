import { Request, Response, NextFunction } from 'express';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import objectInventoryAiService from '../services/objectInventoryAiService.js';
import {
  ApplicationFieldInput,
  ApplicationSchemaInput,
  ApplicationTableInput,
  CdmFieldProposal,
  SuggestMappingsRequest,
} from '../types/objectInventoryAi.js';

const asString = (value: unknown) => String(value || '').trim();

const buildApplicationSchemas = (rows: any[]): ApplicationSchemaInput[] => {
  const appMap = new Map<string, ApplicationSchemaInput>();
  const tableMapByApp = new Map<string, Map<string, ApplicationTableInput>>();

  for (const row of rows) {
    const applicationId = String(row.application_id);
    const applicationName = asString(row.application_name);

    if (!appMap.has(applicationId)) {
      appMap.set(applicationId, {
        applicationId,
        applicationName,
        vendor: row.vendor || undefined,
        tables: [],
      });
      tableMapByApp.set(applicationId, new Map<string, ApplicationTableInput>());
    }

    const tableName = asString(row.table_name || row?.field_metadata?.tableName || row?.field_metadata?.table || 'ROOT');
    const tableKey = tableName.toLowerCase();
    const appTableMap = tableMapByApp.get(applicationId)!;

    if (!appTableMap.has(tableKey)) {
      const tableRecord: ApplicationTableInput = {
        applicationId,
        applicationName,
        vendor: row.vendor || undefined,
        tableName,
        schemaName: asString(row?.field_metadata?.schemaName),
        fields: [],
      };
      appTableMap.set(tableKey, tableRecord);
      appMap.get(applicationId)!.tables.push(tableRecord);
    }

    if (row.field_name) {
      const field: ApplicationFieldInput = {
        applicationId,
        applicationName,
        tableName,
        fieldName: asString(row.field_name),
        fieldLabel: asString(row.field_label) || undefined,
        dataType: asString(row.data_type) || undefined,
        length: row.length == null ? null : Number(row.length),
        decimals: row.decimals == null ? null : Number(row.decimals),
        description: asString(row.description) || undefined,
        isKey: !!row.is_key,
        isRequired: !!row.is_required,
        metadata: row.field_metadata || {},
      };
      appTableMap.get(tableKey)!.fields.push(field);
    }
  }

  return [...appMap.values()]
    .map((app) => ({
      ...app,
      tables: app.tables.filter((table) => table.fields.length > 0),
    }))
    .filter((app) => app.tables.length > 0);
};

const estimateSubObjectConfidence = (sourceApplications: string[], sourceTables: string[]) => {
  const appFactor = Math.min(sourceApplications.length, 4) * 0.1;
  const tableFactor = Math.min(sourceTables.length, 8) * 0.04;
  return Number(Math.min(0.98, 0.45 + appFactor + tableFactor).toFixed(2));
};

const estimateCdmFieldConfidence = (field: CdmFieldProposal) => {
  const sourceFactor = Math.min(field.sourceFields?.length || 0, 6) * 0.07;
  const aliasFactor = Math.min(field.aliases?.length || 0, 4) * 0.03;
  const requiredBoost = field.required ? 0.06 : 0;
  return Number(Math.min(0.99, 0.5 + sourceFactor + aliasFactor + requiredBoost).toFixed(2));
};

export const analyzeSubObjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objectId = req.params.objectId;

    const objectResult = await db.query(
      `SELECT id, object_id, description
       FROM global_objects
       WHERE id = $1`,
      [objectId]
    );

    if (!objectResult.rows.length) {
      throw new ApiError(404, 'Object not found', 'NOT_FOUND');
    }

    const schemaRowsResult = await db.query(
      `SELECT dd.application_id,
              a.name AS application_name,
              a.vendor,
              f.table_name,
              f.field_name,
              f.field_label,
              f.data_type,
              f.length,
              f.decimals,
              f.description,
              f.is_key,
              f.is_required,
              f.field_metadata
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       LEFT JOIN data_definition_fields f ON f.data_definition_id = dd.id
       WHERE dd.global_object_id = $1
       ORDER BY a.name ASC, COALESCE(f.table_name, '') ASC, f.sort_order ASC, f.field_name ASC`,
      [objectId]
    );

    const applications = buildApplicationSchemas(schemaRowsResult.rows);
    if (!applications.length) {
      throw new ApiError(400, 'No application schema data found for object analysis', 'NO_SCHEMA_DATA');
    }

    const aiResult = await objectInventoryAiService.proposeSubObjects({
      objectName: objectResult.rows[0].object_id,
      objectDescription: objectResult.rows[0].description || undefined,
      applications,
      maxSubObjects: req.body?.maxSubObjects,
      ai: req.body?.ai,
    });

    const subObjectProposals = aiResult.subObjects.map((proposal) => ({
      name: proposal.name,
      description: proposal.description,
      confidenceScore: estimateSubObjectConfidence(proposal.sourceApplications, proposal.sourceTables),
      explanation: proposal.reasoning || proposal.description || 'Proposed from cross-application field overlap.',
      sourceApplications: proposal.sourceApplications,
      sourceTables: proposal.sourceTables,
    }));

    res.json(formatSingleResponse({
      objectId,
      objectName: objectResult.rows[0].object_id,
      analyzedAt: new Date().toISOString(),
      subObjectProposals,
      warnings: aiResult.warnings,
    }));
  } catch (error) {
    next(error);
  }
};

export const deriveSubObjectCdm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = req.params.subObjectId;

    const subObjectResult = await db.query(
      `SELECT so.id, so.name, so.description, so.global_object_id,
              go.object_id, go.description AS object_description
       FROM object_sub_objects so
       JOIN global_objects go ON go.id = so.global_object_id
       WHERE so.id = $1`,
      [subObjectId]
    );

    if (!subObjectResult.rows.length) {
      throw new ApiError(404, 'Sub-object not found', 'NOT_FOUND');
    }

    const schemaRowsResult = await db.query(
      `SELECT dd.application_id,
              a.name AS application_name,
              a.vendor,
              f.table_name,
              f.field_name,
              f.field_label,
              f.data_type,
              f.length,
              f.decimals,
              f.description,
              f.is_key,
              f.is_required,
              f.field_metadata
       FROM data_definitions dd
       JOIN applications a ON a.id = dd.application_id
       LEFT JOIN data_definition_fields f ON f.data_definition_id = dd.id
       WHERE dd.object_sub_object_id = $1
       ORDER BY a.name ASC, COALESCE(f.table_name, '') ASC, f.sort_order ASC, f.field_name ASC`,
      [subObjectId]
    );

    const applications = buildApplicationSchemas(schemaRowsResult.rows);
    const tables: ApplicationTableInput[] = applications.flatMap((app) => app.tables);

    if (!tables.length) {
      throw new ApiError(400, 'No source tables found for sub-object CDM derivation', 'NO_SCHEMA_DATA');
    }

    const aiResult = await objectInventoryAiService.deriveCdmFields({
      objectName: subObjectResult.rows[0].object_id,
      subObjectName: subObjectResult.rows[0].name,
      tables,
      ai: req.body?.ai,
    });

    const cdmFieldProposals = aiResult.cdmFields.map((field) => ({
      fieldName: field.fieldName,
      description: field.description,
      dataType: field.dataType,
      length: field.length,
      required: field.required,
      aliases: field.aliases,
      sourceFields: field.sourceFields,
      confidenceScore: estimateCdmFieldConfidence(field),
      explanation: `Derived from ${field.sourceFields.length} source field(s) across ${field.aliases.length} alias pattern(s).`,
    }));

    res.json(formatSingleResponse({
      objectId: subObjectResult.rows[0].global_object_id,
      objectName: subObjectResult.rows[0].object_id,
      subObjectId,
      subObjectName: subObjectResult.rows[0].name,
      derivedAt: new Date().toISOString(),
      cdmFieldProposals,
      warnings: aiResult.warnings,
    }));
  } catch (error) {
    next(error);
  }
};

const hydrateSourceFieldsFromSubObject = async (subObjectId: string): Promise<ApplicationFieldInput[]> => {
  const result = await db.query(
    `SELECT dd.application_id,
            a.name AS application_name,
            f.table_name,
            f.field_name,
            f.field_label,
            f.data_type,
            f.length,
            f.decimals,
            f.description,
            f.is_key,
            f.is_required,
            f.field_metadata
     FROM data_definitions dd
     JOIN applications a ON a.id = dd.application_id
     JOIN data_definition_fields f ON f.data_definition_id = dd.id
     WHERE dd.object_sub_object_id = $1
     ORDER BY a.name ASC, COALESCE(f.table_name, '') ASC, f.sort_order ASC, f.field_name ASC`,
    [subObjectId]
  );

  return result.rows.map((row: any) => ({
    applicationId: String(row.application_id),
    applicationName: asString(row.application_name) || undefined,
    tableName: asString(row.table_name || row?.field_metadata?.tableName || 'ROOT'),
    fieldName: asString(row.field_name),
    fieldLabel: asString(row.field_label) || undefined,
    dataType: asString(row.data_type) || undefined,
    length: row.length == null ? null : Number(row.length),
    decimals: row.decimals == null ? null : Number(row.decimals),
    description: asString(row.description) || undefined,
    isKey: !!row.is_key,
    isRequired: !!row.is_required,
    metadata: row.field_metadata || {},
  }));
};

const hydrateCdmFieldsFromSubObject = async (subObjectId: string): Promise<CdmFieldProposal[]> => {
  const result = await db.query(
    `SELECT cf.field_name,
            cf.field_description,
            cf.data_type,
            cf.length,
            cf.required,
            cf.validation_rules
     FROM cdm_fields cf
     JOIN common_data_model cdm ON cdm.id = cf.common_data_model_id
     WHERE cdm.object_sub_object_id = $1
     ORDER BY cf.sort_order ASC, cf.field_name ASC`,
    [subObjectId]
  );

  return result.rows.map((row: any) => ({
    fieldName: asString(row.field_name),
    description: asString(row.field_description),
    dataType: asString(row.data_type) || 'string',
    length: row.length == null ? null : Number(row.length),
    required: !!row.required,
    aliases: [],
    sourceFields: Array.isArray(row.validation_rules)
      ? row.validation_rules.map((entry: any) => asString(entry)).filter(Boolean)
      : [],
  }));
};

export const suggestMappings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objectName = asString(req.body?.objectName);
    const subObjectId = asString(req.body?.subObjectId);

    const sourceFields = Array.isArray(req.body?.sourceFields)
      ? req.body.sourceFields
      : (subObjectId ? await hydrateSourceFieldsFromSubObject(subObjectId) : []);

    const cdmFields = Array.isArray(req.body?.cdmFields)
      ? req.body.cdmFields
      : (subObjectId ? await hydrateCdmFieldsFromSubObject(subObjectId) : []);

    if (!objectName && !subObjectId) {
      throw new ApiError(400, 'objectName or subObjectId is required', 'MISSING_FIELD');
    }
    if (!sourceFields.length) {
      throw new ApiError(400, 'sourceFields are required (or provide subObjectId with source fields)', 'MISSING_FIELD');
    }
    if (!cdmFields.length) {
      throw new ApiError(400, 'cdmFields are required (or provide subObjectId with derived CDM fields)', 'MISSING_FIELD');
    }

    const payload: SuggestMappingsRequest = {
      objectName: objectName || subObjectId,
      sourceFields,
      cdmFields,
      ai: req.body?.ai,
    };

    const aiResult = await objectInventoryAiService.suggestFieldMappings(payload);

    const mappingSuggestions = aiResult.mappings.map((mapping) => ({
      sourceFieldName: mapping.sourceFieldName,
      sourceTableName: mapping.sourceTableName,
      cdmFieldName: mapping.cdmFieldName,
      confidenceScore: Number(mapping.confidence.toFixed(2)),
      explanation: mapping.rationale || 'Matched by semantic similarity.',
      transformRule: mapping.transformRule || null,
      matchType: mapping.matchType || 'semantic',
    }));

    const avgConfidence = mappingSuggestions.length
      ? Number((mappingSuggestions.reduce((sum, row) => sum + row.confidenceScore, 0) / mappingSuggestions.length).toFixed(2))
      : 0;

    res.json(formatSingleResponse({
      suggestedAt: new Date().toISOString(),
      totalSuggestions: mappingSuggestions.length,
      averageConfidenceScore: avgConfidence,
      mappingSuggestions,
      unmappedSourceFields: aiResult.unmappedSourceFields,
      warnings: aiResult.warnings,
    }));
  } catch (error) {
    next(error);
  }
};
