import { ApiError } from '../middleware/errorHandler.js';
import aiExecutionService from './aiExecutionService.js';
import {
  CdmFieldProposal,
  DeriveCdmFieldsRequest,
  DeriveCdmFieldsResult,
  FieldMappingSuggestion,
  ProposeSubObjectsRequest,
  ProposeSubObjectsResult,
  SubObjectProposal,
  SuggestMappingsRequest,
  SuggestMappingsResult,
} from '../types/objectInventoryAi.js';
import modelRegistryService from './modelRegistryService.js';

const LOGGER_SCOPE = '[ObjectInventoryAI]';

const extractBalancedSegment = (input: string, openChar: '[' | '{', closeChar: ']' | '}') => {
  const start = input.indexOf(openChar);
  if (start < 0) {
    return '';
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];

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

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return '';
};

const parseJsonFromAi = (text: string): any => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new ApiError(502, 'AI response was empty', 'AI_EMPTY_RESPONSE');
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  const candidates = [
    trimmed,
    fenced?.[1] || '',
    extractBalancedSegment(trimmed, '[', ']'),
    extractBalancedSegment(trimmed, '{', '}'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue trying candidates.
    }
  }

  throw new ApiError(502, 'AI response JSON could not be parsed', 'AI_INVALID_JSON');
};

const extractAiText = (executionResult: any): string => {
  const openAi = executionResult?.result?.response?.choices?.[0]?.message?.content;
  if (typeof openAi === 'string') {
    return openAi;
  }

  const anthropic = executionResult?.result?.response?.content;
  if (Array.isArray(anthropic)) {
    const text = anthropic
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
    if (text) {
      return text;
    }
  }

  const databricks =
    executionResult?.result?.response?.predictions?.[0] ||
    executionResult?.result?.response?.outputs?.[0] ||
    executionResult?.result?.response?.result;

  if (typeof databricks === 'string') {
    return databricks;
  }

  return '';
};

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
};

const normalizeSubObject = (row: any): SubObjectProposal | null => {
  const name = String(row?.name || row?.subObjectName || '').trim();
  if (!name) {
    return null;
  }

  return {
    name,
    description: String(row?.description || '').trim(),
    reasoning: String(row?.reasoning || '').trim(),
    sourceApplications: normalizeList(row?.sourceApplications),
    sourceTables: normalizeList(row?.sourceTables),
  };
};

const normalizeCdmField = (row: any): CdmFieldProposal | null => {
  const fieldName = String(row?.fieldName || row?.name || '').trim();
  if (!fieldName) {
    return null;
  }

  const rawLength = row?.length;
  const parsedLength = rawLength === '' || rawLength == null ? null : Number(rawLength);

  return {
    fieldName,
    description: String(row?.description || '').trim(),
    dataType: String(row?.dataType || row?.type || 'string').trim(),
    length: Number.isFinite(parsedLength as number) ? parsedLength : null,
    required: !!row?.required,
    aliases: normalizeList(row?.aliases),
    sourceFields: normalizeList(row?.sourceFields),
  };
};

const normalizeMapping = (row: any): FieldMappingSuggestion | null => {
  const sourceFieldName = String(row?.sourceFieldName || '').trim();
  const cdmFieldName = String(row?.cdmFieldName || '').trim();
  if (!sourceFieldName || !cdmFieldName) {
    return null;
  }

  const confidenceRaw = Number(row?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0;

  const matchTypeRaw = String(row?.matchType || '').trim().toLowerCase();
  const matchType = ['exact', 'semantic', 'derived', 'manual_review'].includes(matchTypeRaw)
    ? (matchTypeRaw as FieldMappingSuggestion['matchType'])
    : undefined;

  return {
    sourceFieldName,
    sourceTableName: String(row?.sourceTableName || '').trim(),
    cdmFieldName,
    confidence,
    rationale: String(row?.rationale || '').trim(),
    transformRule: row?.transformRule ? String(row.transformRule) : undefined,
    matchType,
  };
};

class ObjectInventoryAiService {
  private async resolveModelId(routing: any, defaultCapabilities: string[]) {
    if (routing?.modelId) {
      return {
        modelId: String(routing.modelId),
        selectionReason: 'explicit-model-id',
      };
    }

    const resolved = await modelRegistryService.resolveModel({
      modelName: routing?.modelName,
      capability: routing?.capability || defaultCapabilities,
      costTier: routing?.costTier,
      provider: routing?.provider,
      allowFallback: routing?.allowFallback,
    });

    return {
      modelId: resolved.model.id,
      selectionReason: resolved.reason,
    };
  }

  private async runStructuredPrompt(prompt: string, routing: any, defaultCapabilities: string[]): Promise<any> {
    const modelSelection = await this.resolveModelId(routing, defaultCapabilities);

    const payload = {
      messages: [
        {
          role: 'system',
          content:
            'You are a data modeling assistant. Return strictly valid JSON only, no markdown and no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      maxTokens: 2200,
      timeoutMs: routing?.timeoutMs || 22000,
    };

    const execution = await aiExecutionService.execute({
      modelId: modelSelection.modelId,
      gatewayId: routing?.gatewayId,
      routerId: routing?.routerId,
      policyId: routing?.policyId,
      capabilityKeys: [],
      payload,
    });

    console.info(`${LOGGER_SCOPE} model selected`, {
      modelId: modelSelection.modelId,
      reason: modelSelection.selectionReason,
    });

    const aiText = extractAiText(execution);
    if (!aiText) {
      throw new ApiError(502, 'AI provider returned no text output', 'AI_EMPTY_RESPONSE');
    }

    return parseJsonFromAi(aiText);
  }

  async proposeSubObjects(input: ProposeSubObjectsRequest): Promise<ProposeSubObjectsResult> {
    if (!input.objectName?.trim()) {
      throw new ApiError(400, 'objectName is required', 'MISSING_FIELD');
    }
    if (!Array.isArray(input.applications) || input.applications.length === 0) {
      throw new ApiError(400, 'applications must be a non-empty array', 'MISSING_FIELD');
    }

    const prompt = [
      'Create sub-object proposals for a business data object.',
      `Object Name: ${input.objectName}`,
      `Object Description: ${input.objectDescription || ''}`,
      `Max Sub-Objects: ${input.maxSubObjects || 8}`,
      '',
      'Source application schemas:',
      JSON.stringify(input.applications, null, 2),
      '',
      'Return JSON with shape:',
      '{"subObjects":[{"name":"","description":"","reasoning":"","sourceApplications":[],"sourceTables":[]}],"warnings":[]}',
      `Limit output to at most ${input.maxSubObjects || 8} subObjects.`,
    ].join('\n');

    const parsed = await this.runStructuredPrompt(prompt, input.ai, ['chat', 'reasoning', 'schema-analysis']);
    const rawSubObjects = Array.isArray(parsed?.subObjects) ? parsed.subObjects : [];
    const subObjects = rawSubObjects
      .map((row: any) => normalizeSubObject(row))
      .filter((row: SubObjectProposal | null): row is SubObjectProposal => Boolean(row));

    if (!subObjects.length) {
      throw new ApiError(502, 'AI did not return usable sub-object proposals', 'AI_INVALID_STRUCTURE');
    }

    return {
      subObjects,
      warnings: normalizeList(parsed?.warnings),
    };
  }

  async deriveCdmFields(input: DeriveCdmFieldsRequest): Promise<DeriveCdmFieldsResult> {
    if (!input.objectName?.trim()) {
      throw new ApiError(400, 'objectName is required', 'MISSING_FIELD');
    }
    if (!Array.isArray(input.tables) || input.tables.length === 0) {
      throw new ApiError(400, 'tables must be a non-empty array', 'MISSING_FIELD');
    }

    const prompt = [
      'Derive canonical Common Data Model fields from source tables.',
      `Object Name: ${input.objectName}`,
      `Sub-Object Name: ${input.subObjectName || ''}`,
      '',
      'Source tables and fields:',
      JSON.stringify(input.tables, null, 2),
      '',
      'Return JSON with shape:',
      '{"cdmFields":[{"fieldName":"","description":"","dataType":"","length":null,"required":false,"aliases":[],"sourceFields":[]}],"warnings":[]}',
      'Consolidate synonyms and duplicates into canonical field names.',
    ].join('\n');

    const parsed = await this.runStructuredPrompt(prompt, input.ai, ['chat', 'reasoning', 'schema-analysis']);
    const rawCdmFields = Array.isArray(parsed?.cdmFields) ? parsed.cdmFields : [];
    const cdmFields = rawCdmFields
      .map((row: any) => normalizeCdmField(row))
      .filter((row: CdmFieldProposal | null): row is CdmFieldProposal => Boolean(row));

    if (!cdmFields.length) {
      throw new ApiError(502, 'AI did not return usable CDM field proposals', 'AI_INVALID_STRUCTURE');
    }

    return {
      cdmFields,
      warnings: normalizeList(parsed?.warnings),
    };
  }

  async suggestFieldMappings(input: SuggestMappingsRequest): Promise<SuggestMappingsResult> {
    if (!input.objectName?.trim()) {
      throw new ApiError(400, 'objectName is required', 'MISSING_FIELD');
    }
    if (!Array.isArray(input.sourceFields) || input.sourceFields.length === 0) {
      throw new ApiError(400, 'sourceFields must be a non-empty array', 'MISSING_FIELD');
    }
    if (!Array.isArray(input.cdmFields) || input.cdmFields.length === 0) {
      throw new ApiError(400, 'cdmFields must be a non-empty array', 'MISSING_FIELD');
    }

    const prompt = [
      'Map source application fields to canonical CDM fields.',
      `Object Name: ${input.objectName}`,
      '',
      'Source fields:',
      JSON.stringify(input.sourceFields, null, 2),
      '',
      'CDM fields:',
      JSON.stringify(input.cdmFields, null, 2),
      '',
      'Return JSON with shape:',
      '{"mappings":[{"sourceFieldName":"","sourceTableName":"","cdmFieldName":"","confidence":0.0,"rationale":"","transformRule":"","matchType":"semantic"}],"unmappedSourceFields":[],"warnings":[]}',
      'Use confidence in range 0..1.',
    ].join('\n');

    let parsed: any;
    try {
      parsed = await this.runStructuredPrompt(prompt, input.ai, ['chat', 'reasoning', 'code']);
    } catch (error) {
      console.warn(`${LOGGER_SCOPE} suggestFieldMappings AI call failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const rawMappings = Array.isArray(parsed?.mappings) ? parsed.mappings : [];
    const mappings = rawMappings
      .map((row: any) => normalizeMapping(row))
      .filter((row: FieldMappingSuggestion | null): row is FieldMappingSuggestion => Boolean(row));

    const allSourceNames = new Set(input.sourceFields.map((row) => String(row.fieldName || '').trim()).filter(Boolean));
    const mappedSourceNames = new Set(mappings.map((row) => row.sourceFieldName));
    const fallbackUnmapped = [...allSourceNames].filter((name) => !mappedSourceNames.has(name));

    return {
      mappings,
      unmappedSourceFields: normalizeList(parsed?.unmappedSourceFields).length
        ? normalizeList(parsed?.unmappedSourceFields)
        : fallbackUnmapped,
      warnings: normalizeList(parsed?.warnings),
    };
  }
}

export default new ObjectInventoryAiService();
