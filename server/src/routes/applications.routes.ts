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

type SapFallbackField = {
  fieldName: string;
  label?: string;
  fieldType?: string;
  fieldLength?: number | null;
  decimalPlaces?: number | null;
  fieldDescription?: string;
};

const SAP_TABLE_FALLBACK_FIELDS: Record<string, SapFallbackField[]> = {
  KNA1: [
    { fieldName: 'KUNNR', label: 'Customer Number', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'LAND1', label: 'Country Key', fieldType: 'CHAR', fieldLength: 3 },
    { fieldName: 'NAME1', label: 'Name 1', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'NAME2', label: 'Name 2', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'NAME3', label: 'Name 3', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'NAME4', label: 'Name 4', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'ORT01', label: 'City', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'ORT02', label: 'District', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'PSTLZ', label: 'Postal Code', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'STRAS', label: 'Street', fieldType: 'CHAR', fieldLength: 35 },
    { fieldName: 'REGIO', label: 'Region', fieldType: 'CHAR', fieldLength: 3 },
    { fieldName: 'SPRAS', label: 'Language Key', fieldType: 'LANG', fieldLength: 1 },
    { fieldName: 'SORTL', label: 'Search Term', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'TELF1', label: 'Telephone 1', fieldType: 'CHAR', fieldLength: 16 },
    { fieldName: 'TELF2', label: 'Telephone 2', fieldType: 'CHAR', fieldLength: 16 },
    { fieldName: 'TELFX', label: 'Fax', fieldType: 'CHAR', fieldLength: 31 },
    { fieldName: 'SMTP_ADDR', label: 'Email Address', fieldType: 'CHAR', fieldLength: 241 },
    { fieldName: 'ADRNR', label: 'Address Number', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'STCD1', label: 'Tax Number 1', fieldType: 'CHAR', fieldLength: 16 },
    { fieldName: 'STCD2', label: 'Tax Number 2', fieldType: 'CHAR', fieldLength: 11 },
    { fieldName: 'STCD3', label: 'Tax Number 3', fieldType: 'CHAR', fieldLength: 18 },
    { fieldName: 'STCD4', label: 'Tax Number 4', fieldType: 'CHAR', fieldLength: 18 },
    { fieldName: 'STCEG', label: 'VAT Registration Number', fieldType: 'CHAR', fieldLength: 20 },
    { fieldName: 'KTOKD', label: 'Account Group', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'KUKLA', label: 'Customer Classification', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'KONZS', label: 'Group Key', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BRSCH', label: 'Industry Key', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'BRAN1', label: 'Industry 1', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BRAN2', label: 'Industry 2', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BRAN3', label: 'Industry 3', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BAHNE', label: 'Express Station', fieldType: 'CHAR', fieldLength: 25 },
    { fieldName: 'BAHNS', label: 'Train Station', fieldType: 'CHAR', fieldLength: 25 },
    { fieldName: 'LIFNR', label: 'Vendor Number', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'PERIV', label: 'Fiscal Year Variant', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'LOEVM', label: 'Deletion Flag', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'SPERR', label: 'Central Blocking Flag', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'AUFSD', label: 'Order Block', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'NIELS', label: 'Natural Person', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'FISKN', label: 'Fiscal Address', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BAPIZIP', label: 'BAPI Postal Code', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'XCPDK', label: 'One-Time Account', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'XZEMP', label: 'Alternative Payer Flag', fieldType: 'CHAR', fieldLength: 1 },
  ],
  KNB1: [
    { fieldName: 'KUNNR', label: 'Customer Number', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'BUKRS', label: 'Company Code', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'AKONT', label: 'Reconciliation Account', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'ZTERM', label: 'Payment Terms', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'ZWELS', label: 'Payment Methods', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'ZAHLS', label: 'Payment Block', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'ALTKN', label: 'Previous Account Number', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'FDGRV', label: 'Planning Group', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'VZSKZ', label: 'Interest Indicator', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'BUSAB', label: 'Accounting Clerk', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'ZUAWA', label: 'Sort Key', fieldType: 'CHAR', fieldLength: 3 },
    { fieldName: 'TOGRU', label: 'Tolerance Group', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'LOEVM', label: 'Deletion Flag', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'SPERR', label: 'Posting Block', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'XZAHL', label: 'Payment History Record', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'REPRF', label: 'Check Double Invoice', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'HBKID', label: 'House Bank', fieldType: 'CHAR', fieldLength: 5 },
    { fieldName: 'HZUOR', label: 'Assignment Number', fieldType: 'CHAR', fieldLength: 3 },
    { fieldName: 'MGRUP', label: 'Dunning Group', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'BEGRU', label: 'Authorization Group', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'EDIKG', label: 'EDI Group', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'PERNR', label: 'Personnel Number', fieldType: 'NUMC', fieldLength: 8 },
    { fieldName: 'NODEL', label: 'Dunning Block', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'FRGRP', label: 'Release Group', fieldType: 'CHAR', fieldLength: 4 },
    { fieldName: 'CIVVE', label: 'Credit Segment', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'FDLEV', label: 'Clearing Between Cust/Vend', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'KNRZE', label: 'Head Office Account', fieldType: 'CHAR', fieldLength: 10 },
    { fieldName: 'DUEFL', label: 'Due Date Calculation', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'XDEZV', label: 'Memo Record Flag', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'WAKON', label: 'Collection Group', fieldType: 'CHAR', fieldLength: 2 },
    { fieldName: 'XVERR', label: 'Record Payment History', fieldType: 'CHAR', fieldLength: 1 },
    { fieldName: 'KVERM', label: 'Account Memo', fieldType: 'CHAR', fieldLength: 30 },
    { fieldName: 'KLIMK', label: 'Credit Limit', fieldType: 'CURR', fieldLength: 15, decimalPlaces: 2 },
    { fieldName: 'CRBLB', label: 'Credit Exposure', fieldType: 'CURR', fieldLength: 15, decimalPlaces: 2 },
  ],
};

const buildFallbackProposal = (tableName: string, field: SapFallbackField, index: number) => ({
  id: `fallback-${tableName}-${field.fieldName}-${index}`,
  fieldName: field.fieldName,
  label: field.label || field.fieldName,
  table: tableName,
  tableName,
  fieldDescription: field.fieldDescription || `${field.label || field.fieldName} field in SAP ${tableName}.`,
  applicationUsage: '',
  businessDefinition: '',
  businessRules: '',
  fieldType: field.fieldType || '',
  fieldLength: field.fieldLength ?? null,
  decimalPlaces: field.decimalPlaces ?? null,
  systemRequired: false,
  businessProcessRequired: false,
  suppressedField: false,
  legalRegulatoryImplications: '',
  securityClassification: '',
  referenceTable: '',
  groupingTab: '',
  piiType: '',
  securityControls: '',
});

const applySapFallbackCoverage = (rows: any[]) => {
  let proposals = Array.isArray(rows) ? rows : [];
  const counts = countByTable(proposals);

  Object.entries(SAP_TABLE_FALLBACK_FIELDS).forEach(([tableName, fallbackFields]) => {
    const currentCount = counts.get(tableName) || 0;
    if (currentCount >= 20) {
      return;
    }

    const existing = new Set(
      proposals
        .filter((row) => String(row?.tableName || row?.table || '').trim().toUpperCase() === tableName)
        .map((row) => String(row?.fieldName || '').trim().toUpperCase())
        .filter(Boolean)
    );

    const missing = fallbackFields.filter((field) => !existing.has(field.fieldName.toUpperCase()));
    if (!missing.length) {
      return;
    }

    const fallbackRows = missing.map((field, index) => buildFallbackProposal(tableName, field, index));
    proposals = mergeUniqueProposals(proposals, fallbackRows);
  });

  return proposals;
};

const enrichIncompleteMetadataFromFallback = (rows: any[]) => {
  const lookup = new Map<string, SapFallbackField>();
  Object.entries(SAP_TABLE_FALLBACK_FIELDS).forEach(([tableName, fields]) => {
    fields.forEach((field) => {
      lookup.set(`${tableName}::${field.fieldName.toUpperCase()}`, field);
    });
  });

  return (rows || []).map((row: any) => {
    const tableName = String(row?.tableName || row?.table || '').trim().toUpperCase();
    const fieldName = String(row?.fieldName || '').trim().toUpperCase();
    if (!tableName || !fieldName) {
      return row;
    }

    const match = lookup.get(`${tableName}::${fieldName}`);
    if (!match) {
      return row;
    }

    const hasType = String(row?.fieldType || '').trim().length > 0;
    const hasLength = row?.fieldLength != null && row?.fieldLength !== '';
    const hasLabel = String(row?.label || '').trim().length > 0;

    return {
      ...row,
      label: hasLabel ? row.label : (match.label || fieldName),
      fieldType: hasType ? row.fieldType : (match.fieldType || ''),
      fieldLength: hasLength ? row.fieldLength : (match.fieldLength ?? null),
      decimalPlaces: row?.decimalPlaces == null ? (match.decimalPlaces ?? null) : row.decimalPlaces,
      fieldDescription: String(row?.fieldDescription || '').trim() || match.fieldDescription || row?.fieldDescription || '',
    };
  });
};

const inferSecurityClassification = (fieldName: string) => {
  const upper = fieldName.toUpperCase();
  if (/NAME|TEL|SMTP|EMAIL|STRAS|PSTLZ|ORT|ADR|STCD|TAX|VAT/.test(upper)) {
    return 'Confidential';
  }
  if (/KUNNR|BUKRS|AKONT|KTOKD|ZTERM|LOEVM|SPERR/.test(upper)) {
    return 'Internal';
  }
  return 'Internal';
};

const inferPiiType = (fieldName: string) => {
  const upper = fieldName.toUpperCase();
  if (/NAME/.test(upper)) return 'Name';
  if (/TEL|SMTP|EMAIL/.test(upper)) return 'Contact';
  if (/STRAS|ORT|PSTLZ|REGIO|ADR/.test(upper)) return 'Address';
  if (/STCD|TAX|VAT/.test(upper)) return 'Government ID';
  return '';
};

const isSapApplication = (applicationName: string, vendor: string, version: string) => {
  const composite = `${applicationName} ${vendor} ${version}`.toLowerCase();
  return /\bsap\b|s\/4|s4hana|s4|ecc/.test(composite);
};

const filterToSelectedApplicationScope = (
  rows: any[],
  options: { isSap: boolean; groundedTables: Set<string> }
) => {
  const sapPrefixes = ['KNA', 'KNB', 'KNV', 'LFA', 'MARA', 'BKPF', 'BSEG', 'T001', 'ADRC'];
  const grounded = options.groundedTables;

  return (rows || []).filter((row: any) => {
    const rawTable = String(row?.tableName || row?.table || '').trim();
    if (!rawTable) {
      return true;
    }

    const table = rawTable.toUpperCase();

    // If we already have grounded tables for this selected application, keep only grounded tables.
    if (grounded.size > 0) {
      return grounded.has(table);
    }

    if (options.isSap) {
      // SAP transparent/master tables are typically uppercase alphanumeric identifiers.
      return /^[A-Z][A-Z0-9_]{2,}$/.test(table);
    }

    // For non-SAP applications, remove common SAP table families.
    return !sapPrefixes.some((prefix) => table.startsWith(prefix));
  });
};

const inferBusinessDomain = (fieldName: string) => {
  const upper = fieldName.toUpperCase();
  if (/KUNNR|KTOKD|AKONT|BUKRS|ALTKN|KNRZE/.test(upper)) return 'customer-accounting integration and postings';
  if (/ZTERM|ZWELS|ZAHLS|FDGRV|DUEFL|XVERR|WAKON/.test(upper)) return 'payment processing and collections';
  if (/SPERR|LOEVM|AUFSD|NODEL|TOGRU/.test(upper)) return 'lifecycle status and transaction controls';
  if (/KLIMK|CRBLB|CIVVE|FDLEV/.test(upper)) return 'credit and risk management';
  if (/NAME|SORTL|TITLE|ANRED/.test(upper)) return 'customer identification and search';
  if (/STRAS|ORT|PSTLZ|REGIO|LAND|ADR/.test(upper)) return 'address validation and correspondence';
  if (/TEL|SMTP|EMAIL|FAX/.test(upper)) return 'customer communications';
  if (/STCD|STCEG|TAX|VAT/.test(upper)) return 'tax determination and statutory reporting';
  if (/BRAN|BRSCH|KUKLA|KONZS/.test(upper)) return 'customer segmentation and analytics';
  return 'customer master processing';
};

const isGenericApplicationUsage = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;
  return /^used in sap s\/4hana customer master processing for\s+[a-z0-9_]+\.?$/i.test(normalized);
};

const isGenericBusinessDefinition = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;
  return /business attribute captured in\s+[a-z0-9_]+\.?$/i.test(normalized);
};

const isGenericBusinessRules = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;
  return /^maintain according to sap\s+[a-z0-9_]+\s+domain and validation rules\.?$/i.test(normalized);
};

const hydrateProposalMetadata = (rows: any[]) => {
  return (rows || []).map((row: any) => {
    const tableName = String(row?.tableName || row?.table || '').trim().toUpperCase();
    const fieldName = String(row?.fieldName || '').trim().toUpperCase();
    const label = String(row?.label || '').trim() || fieldName;
    const existingDescription = String(row?.fieldDescription || '').trim();
    const isGenericFallbackDescription = /^fallback sap field for\s+[a-z0-9_]+\.?$/i.test(existingDescription);
    const fieldDescription = (existingDescription && !isGenericFallbackDescription)
      ? existingDescription
      : `${label} field from SAP ${tableName || 'table'}.`;

    const fieldType = String(row?.fieldType || '').trim() || 'CHAR';
    const fieldLength = row?.fieldLength == null || row?.fieldLength === ''
      ? (fieldType === 'CHAR' ? 40 : null)
      : row.fieldLength;

    const securityClassification = String(row?.securityClassification || '').trim()
      || inferSecurityClassification(fieldName);
    const piiType = String(row?.piiType || '').trim() || inferPiiType(fieldName);

    const isCoreKey = fieldName === 'KUNNR' || fieldName === 'BUKRS';
    const businessDomain = inferBusinessDomain(fieldName);
    const applicationUsageExisting = String(row?.applicationUsage || '');
    const businessDefinitionExisting = String(row?.businessDefinition || '');
    const businessRulesExisting = String(row?.businessRules || '');

    const applicationUsage = isGenericApplicationUsage(applicationUsageExisting)
      ? `${label} is used in ${tableName || 'SAP'} for ${businessDomain}.`
      : applicationUsageExisting.trim();
    const businessDefinition = isGenericBusinessDefinition(businessDefinitionExisting)
      ? `${label} represents a ${businessDomain} attribute in ${tableName || 'the SAP source table'}.`
      : businessDefinitionExisting.trim();
    const businessRules = isGenericBusinessRules(businessRulesExisting)
      ? `${label} must comply with SAP domain constraints, required-field checks, and integration validation for ${businessDomain}.`
      : businessRulesExisting.trim();

    return {
      ...row,
      label,
      table: row?.table || tableName,
      tableName: row?.tableName || tableName,
      fieldDescription,
      applicationUsage,
      businessDefinition,
      businessRules,
      fieldType,
      fieldLength,
      decimalPlaces: row?.decimalPlaces == null || row?.decimalPlaces === '' ? null : row.decimalPlaces,
      systemRequired: typeof row?.systemRequired === 'boolean' ? row.systemRequired : isCoreKey,
      businessProcessRequired: typeof row?.businessProcessRequired === 'boolean' ? row.businessProcessRequired : isCoreKey,
      suppressedField: !!row?.suppressedField,
      legalRegulatoryImplications: String(row?.legalRegulatoryImplications || '').trim()
        || (/STCD|TAX|VAT/.test(fieldName) ? 'May have tax/regulatory reporting impact.' : 'Review based on process and compliance context.'),
      securityClassification,
      referenceTable: String(row?.referenceTable || '').trim()
        || (fieldName === 'KUNNR' ? 'KNA1' : ''),
      groupingTab: String(row?.groupingTab || '').trim() || (tableName || 'General'),
      piiType,
      securityControls: String(row?.securityControls || '').trim()
        || 'Role-based access, logging, and change audit controls.',
    };
  });
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

const normalizeSchemaSourceType = (value: any): 'databricks' | 'jdbc' | 'api' => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'jdbc') return 'jdbc';
  if (normalized === 'api') return 'api';
  return 'databricks';
};

const normalizeSchemaSourceConfig = (value: any) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const normalizeArrayMetadata = (value: any) => {
  return Array.isArray(value) ? value : [];
};

const parseJsonArray = (value: any) => (Array.isArray(value) ? value : []);
const parseJsonObject = (value: any) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const formatApplicationSchemaModel = (row: any) => {
  const applicationId = String(row?.application_id || row?.id || '');
  const tables = parseJsonArray(row?.tables ?? row?.tables_metadata);
  const fields = parseJsonArray(row?.fields ?? row?.fields_metadata);
  return {
    applicationId,
    tables,
    fields,
  };
};

const formatApplicationModel = (row: any) => {
  const schemaSourceType = normalizeSchemaSourceType(row?.schema_source_type ?? row?.schemaSourceType);
  const schemaSourceConfig = parseJsonObject(row?.schema_source_config ?? row?.schemaSourceConfig);
  const applicationSchema = formatApplicationSchemaModel({
    application_id: row?.id,
    tables: row?.schema_tables,
    fields: row?.schema_fields,
    tables_metadata: row?.tables_metadata,
    fields_metadata: row?.fields_metadata,
  });

  return {
    id: row?.id,
    name: row?.name,
    vendor: row?.vendor,
    version: row?.version,
    applicationSchema,
    // compatibility fields
    description: row?.description,
    isActive: row?.is_active,
    schemaSourceType,
    schemaSourceConfig,
    tablesMetadata: parseJsonArray(row?.tables_metadata),
    fieldsMetadata: parseJsonArray(row?.fields_metadata),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
  };
};

const formatMappingModel = (row: any) => ({
  id: row?.id,
  objectId: row?.global_object_id,
  applicationId: row?.application_id,
  mappedTables: parseJsonArray(row?.mapped_tables),
  mappedFields: parseJsonArray(row?.mapped_fields),
  applicationUsage: row?.application_usage || null,
  businessRules: row?.business_rules || null,
  // compatibility fields
  objectSubObjectId: row?.object_sub_object_id || null,
  notes: row?.notes || null,
  applicationName: row?.application_name,
  vendor: row?.vendor,
  version: row?.version,
  subObjectName: row?.sub_object_name,
  createdAt: row?.created_at,
  updatedAt: row?.updated_at,
});

const formatSchemaSourceModel = (row: any) => ({
  applicationId: row?.id || row?.application_id,
  schemaSourceType: normalizeSchemaSourceType(row?.schema_source_type ?? row?.schemaSourceType),
  schemaSourceConfig: parseJsonObject(row?.schema_source_config ?? row?.schemaSourceConfig),
});

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.name, a.description, a.vendor, a.version, a.is_active,
              a.schema_source_type, a.schema_source_config, a.tables_metadata, a.fields_metadata,
              s.tables AS schema_tables, s.fields AS schema_fields,
              a.created_at, a.updated_at
       FROM applications a
       LEFT JOIN application_schemas s ON s.application_id = a.id
       ORDER BY a.name ASC`
    );
    const rows = result.rows.map((row) => formatApplicationModel(row));
    res.json(formatListResponse(rows, rows.length));
  } catch (err) { next(err); }
});

router.get('/:id/schema-source', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT id, schema_source_type, schema_source_config
       FROM applications
       WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'Application not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(formatSchemaSourceModel(result.rows[0])));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/schema-source', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schemaSourceType = normalizeSchemaSourceType(req.body?.schemaSourceType ?? req.body?.schema_source_type);
    const schemaSourceConfig = normalizeSchemaSourceConfig(req.body?.schemaSourceConfig ?? req.body?.schema_source_config);

    const result = await db.query(
      `UPDATE applications
       SET schema_source_type = $1,
           schema_source_config = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, schema_source_type, schema_source_config`,
      [schemaSourceType, JSON.stringify(schemaSourceConfig), req.params.id]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'Application not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(formatSchemaSourceModel(result.rows[0])));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/tables', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT tables
       FROM application_schemas
       WHERE application_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      const exists = await db.query(`SELECT id FROM applications WHERE id = $1`, [req.params.id]);
      if (!exists.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
      res.json(formatSingleResponse({ applicationId: req.params.id, tables: [] }));
      return;
    }

    res.json(formatSingleResponse({ applicationId: req.params.id, tables: parseJsonArray(result.rows[0].tables) }));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/tables', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = normalizeArrayMetadata(req.body?.tables ?? req.body?.tablesMetadata ?? req.body?.tables_metadata);
    const result = await db.query(
      `INSERT INTO application_schemas (application_id, tables, fields)
       VALUES ($1, $2::jsonb, '[]'::jsonb)
       ON CONFLICT (application_id)
       DO UPDATE SET tables = EXCLUDED.tables, updated_at = CURRENT_TIMESTAMP
       RETURNING application_id, tables`,
      [req.params.id, JSON.stringify(tables)]
    );

    await db.query(
      `UPDATE applications
       SET tables_metadata = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id, JSON.stringify(tables)]
    );

    res.json(formatSingleResponse({ applicationId: result.rows[0].application_id, tables: parseJsonArray(result.rows[0].tables) }));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/fields', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT fields
       FROM application_schemas
       WHERE application_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      const exists = await db.query(`SELECT id FROM applications WHERE id = $1`, [req.params.id]);
      if (!exists.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
      res.json(formatSingleResponse({ applicationId: req.params.id, fields: [] }));
      return;
    }

    res.json(formatSingleResponse({ applicationId: req.params.id, fields: parseJsonArray(result.rows[0].fields) }));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/fields', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = normalizeArrayMetadata(req.body?.fields ?? req.body?.fieldsMetadata ?? req.body?.fields_metadata);
    const result = await db.query(
      `INSERT INTO application_schemas (application_id, tables, fields)
       VALUES ($1, '[]'::jsonb, $2::jsonb)
       ON CONFLICT (application_id)
       DO UPDATE SET fields = EXCLUDED.fields, updated_at = CURRENT_TIMESTAMP
       RETURNING application_id, fields`,
      [req.params.id, JSON.stringify(fields)]
    );

    await db.query(
      `UPDATE applications
       SET fields_metadata = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id, JSON.stringify(fields)]
    );

    res.json(formatSingleResponse({ applicationId: result.rows[0].application_id, fields: parseJsonArray(result.rows[0].fields) }));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, vendor, version } = req.body;
    const schemaSourceType = normalizeSchemaSourceType(req.body?.schemaSourceType ?? req.body?.schema_source_type);
    const schemaSourceConfig = normalizeSchemaSourceConfig(req.body?.schemaSourceConfig ?? req.body?.schema_source_config);
    const tablesMetadata = normalizeArrayMetadata(req.body?.tablesMetadata ?? req.body?.tables_metadata);
    const fieldsMetadata = normalizeArrayMetadata(req.body?.fieldsMetadata ?? req.body?.fields_metadata);

    if (!name?.trim()) throw new ApiError(400, 'Application name is required', 'MISSING_FIELD');
    const result = await db.query(
      `INSERT INTO applications (name, description, vendor, version, schema_source_type, schema_source_config, tables_metadata, fields_metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
       RETURNING id, name, description, vendor, version, is_active,
                 schema_source_type, schema_source_config, tables_metadata, fields_metadata,
                 created_at, updated_at`,
      [name.trim(), description || null, vendor || null, version || null, schemaSourceType, JSON.stringify(schemaSourceConfig), JSON.stringify(tablesMetadata), JSON.stringify(fieldsMetadata)]
    );

    const created = result.rows[0];
    await db.query(
      `INSERT INTO application_schemas (application_id, tables, fields)
       VALUES ($1, $2::jsonb, $3::jsonb)
       ON CONFLICT (application_id)
       DO UPDATE SET tables = EXCLUDED.tables, fields = EXCLUDED.fields, updated_at = CURRENT_TIMESTAMP`,
      [created.id, JSON.stringify(tablesMetadata), JSON.stringify(fieldsMetadata)]
    );

    const schemaResult = await db.query(
      `SELECT application_id, tables, fields FROM application_schemas WHERE application_id = $1`,
      [created.id]
    );

    res.status(201).json(formatSingleResponse(formatApplicationModel({
      ...created,
      schema_tables: schemaResult.rows[0]?.tables || [],
      schema_fields: schemaResult.rows[0]?.fields || [],
    })));
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, vendor, version, isActive } = req.body;
    const schemaSourceType = normalizeSchemaSourceType(req.body?.schemaSourceType ?? req.body?.schema_source_type);
    const schemaSourceConfig = normalizeSchemaSourceConfig(req.body?.schemaSourceConfig ?? req.body?.schema_source_config);
    const tablesMetadata = normalizeArrayMetadata(req.body?.tablesMetadata ?? req.body?.tables_metadata);
    const fieldsMetadata = normalizeArrayMetadata(req.body?.fieldsMetadata ?? req.body?.fields_metadata);

    const result = await db.query(
      `UPDATE applications
       SET name=$1,
           description=$2,
           vendor=$3,
           version=$4,
           is_active=$5,
           schema_source_type=$6,
           schema_source_config=$7::jsonb,
           tables_metadata=$8::jsonb,
           fields_metadata=$9::jsonb,
           updated_at=CURRENT_TIMESTAMP
      WHERE id=$10
       RETURNING id, name, description, vendor, version, is_active,
                 schema_source_type, schema_source_config, tables_metadata, fields_metadata,
                 created_at, updated_at`,
      [
        name?.trim() || '',
        description || null,
        vendor || null,
        version || null,
        isActive !== false,
        schemaSourceType,
        JSON.stringify(schemaSourceConfig),
        JSON.stringify(tablesMetadata),
        JSON.stringify(fieldsMetadata),
        req.params.id,
      ]
    );
    if (!result.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');

    const updated = result.rows[0];
    await db.query(
      `INSERT INTO application_schemas (application_id, tables, fields)
       VALUES ($1, $2::jsonb, $3::jsonb)
       ON CONFLICT (application_id)
       DO UPDATE SET tables = EXCLUDED.tables, fields = EXCLUDED.fields, updated_at = CURRENT_TIMESTAMP`,
      [updated.id, JSON.stringify(tablesMetadata), JSON.stringify(fieldsMetadata)]
    );

    const schemaResult = await db.query(
      `SELECT application_id, tables, fields FROM application_schemas WHERE application_id = $1`,
      [updated.id]
    );

    res.json(formatSingleResponse(formatApplicationModel({
      ...updated,
      schema_tables: schemaResult.rows[0]?.tables || [],
      schema_fields: schemaResult.rows[0]?.fields || [],
    })));
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/:id/schema', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT application_id, tables, fields, created_at, updated_at
       FROM application_schemas
       WHERE application_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      const exists = await db.query(`SELECT id FROM applications WHERE id = $1`, [req.params.id]);
      if (!exists.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');
      res.json(formatSingleResponse({ applicationId: req.params.id, tables: [], fields: [] }));
      return;
    }

    res.json(formatSingleResponse(formatApplicationSchemaModel(result.rows[0])));
  } catch (err) { next(err); }
});

router.put('/:id/schema', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = normalizeArrayMetadata(req.body?.tables);
    const fields = normalizeArrayMetadata(req.body?.fields);

    const appResult = await db.query(`SELECT id FROM applications WHERE id = $1`, [req.params.id]);
    if (!appResult.rows.length) throw new ApiError(404, 'Application not found', 'NOT_FOUND');

    const result = await db.query(
      `INSERT INTO application_schemas (application_id, tables, fields)
       VALUES ($1, $2::jsonb, $3::jsonb)
       ON CONFLICT (application_id)
       DO UPDATE SET tables = EXCLUDED.tables, fields = EXCLUDED.fields, updated_at = CURRENT_TIMESTAMP
       RETURNING application_id, tables, fields, created_at, updated_at`,
      [req.params.id, JSON.stringify(tables), JSON.stringify(fields)]
    );

    await db.query(
      `UPDATE applications
       SET tables_metadata = $2::jsonb,
           fields_metadata = $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id, JSON.stringify(tables), JSON.stringify(fields)]
    );

    res.json(formatSingleResponse(formatApplicationSchemaModel(result.rows[0])));
  } catch (err) { next(err); }
});

// ── Data Definitions (object ↔ application) ───────────────────────────────────

// List all data definitions for a global object (with application info)
router.get('/data-definitions/object/:globalObjectId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subObjectId = String(req.query.subObjectId || '').trim();
    const result = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id,
              dd.notes, dd.mapped_tables, dd.mapped_fields, dd.application_usage, dd.business_rules,
              dd.created_at, dd.updated_at,
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
    const rows = result.rows.map((row) => formatMappingModel(row));
    res.json(formatListResponse(rows, rows.length));
  } catch (err) { next(err); }
});

// Create a data definition (link object to application)
router.post('/data-definitions', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { globalObjectId, applicationId, subObjectId, notes, mappedTables, mappedFields, applicationUsage, businessRules } = req.body;
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
             mapped_tables = $2::jsonb,
             mapped_fields = $3::jsonb,
             application_usage = $4,
             business_rules = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, global_object_id, application_id, object_sub_object_id,
                   notes, mapped_tables, mapped_fields, application_usage, business_rules,
                   created_at, updated_at`,
        [notes || null, JSON.stringify(normalizeArrayMetadata(mappedTables)), JSON.stringify(normalizeArrayMetadata(mappedFields)), applicationUsage || null, businessRules || null, existing.rows[0].id]
      );
      res.status(201).json(formatSingleResponse(formatMappingModel(updated.rows[0])));
      return;
    }

    const result = await db.query(
      `INSERT INTO data_definitions (global_object_id, application_id, object_sub_object_id, notes, mapped_tables, mapped_fields, application_usage, business_rules)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       RETURNING id, global_object_id, application_id, object_sub_object_id,
                 notes, mapped_tables, mapped_fields, application_usage, business_rules,
                 created_at, updated_at`,
      [globalObjectId, applicationId, subObjectId || null, notes || null, JSON.stringify(normalizeArrayMetadata(mappedTables)), JSON.stringify(normalizeArrayMetadata(mappedFields)), applicationUsage || null, businessRules || null]
    );
    res.status(201).json(formatSingleResponse(formatMappingModel(result.rows[0])));
  } catch (err) { next(err); }
});

router.put('/data-definitions/:id', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes, subObjectId, mappedTables, mappedFields, applicationUsage, businessRules } = req.body;
    const hasSubObjectId = Object.prototype.hasOwnProperty.call(req.body || {}, 'subObjectId');
    const result = await db.query(
      `UPDATE data_definitions
       SET notes=$1,
           object_sub_object_id=CASE WHEN $8::boolean THEN $2 ELSE object_sub_object_id END,
           mapped_tables=$3::jsonb,
           mapped_fields=$4::jsonb,
           application_usage=$5,
           business_rules=$6,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$7
       RETURNING id, global_object_id, application_id, object_sub_object_id,
                 notes, mapped_tables, mapped_fields, application_usage, business_rules,
                 created_at, updated_at`,
      [
        notes || null,
        hasSubObjectId ? (subObjectId || null) : null,
        JSON.stringify(normalizeArrayMetadata(mappedTables)),
        JSON.stringify(normalizeArrayMetadata(mappedFields)),
        applicationUsage || null,
        businessRules || null,
        req.params.id,
        hasSubObjectId,
      ]
    );
    if (!result.rows.length) throw new ApiError(404, 'Data definition not found', 'NOT_FOUND');
    res.json(formatSingleResponse(formatMappingModel(result.rows[0])));
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
    const routeStartedAt = Date.now();
    const routeBudgetMs = 26000;
    const remainingBudgetMs = () => routeBudgetMs - (Date.now() - routeStartedAt);
    const targetTableName = String(req.body?.targetTableName || '').trim();

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
      'You are enhancing the data definition for the selected Data Object, Sub-object, and Application inside RediForge.',
      'Return the FULL physical table definition for the selected application and sub-object, including ALL relevant fields from ALL relevant tables.',
      'For each included table, return ALL available physical columns you can identify for that application table, not a representative subset.',
      '',
      'Required quality rules for every field object:',
      '1. Replace generic descriptions with application-specific detail.',
      '2. Replace generic business rules with rules that match the application validation logic.',
      '3. Replace generic application usage with usage tied to actual application processes.',
      '4. Add regulatory implications based on process area (for example SOX, GDPR, HIPAA, PCI, IRS, SEC) when relevant.',
      '5. Add security classifications aligned to enterprise data governance standards.',
      '6. Add PII classifications based on field sensitivity.',
      '7. Add security controls aligned to IAM, RBAC, audit, and logging requirements.',
      '8. Add reference tables and relationship context where applicable.',
      '9. Add grouping/tab metadata.',
      '10. Expand to enterprise-grade detail while staying concise and concrete.',
      '',
      'Grounding rules:',
      '- Use the provided object/sub-object/application/process-area context.',
      '- Use provided metadata and CDM artifacts as grounding.',
      '- If a table is provided (for example JDE F0101 or SAP KNA1), maximize field coverage for that table.',
      '- Include technical, audit, system, reference, and relationship fields.',
      '- Keep fieldName unique per tableName where possible.',
      '- Do not invent impossible table names; prefer grounded tables from context.',
      '',
      'Output format:',
      'Return ONLY JSON as an array of objects with this exact shape:',
      '[{"fieldName":string,"label":string,"tableName":string,"fieldDescription":string,"applicationUsage":string,"businessDefinition":string,"businessRules":string,"fieldType":string,"fieldLength":number|null,"decimalPlaces":number|null,"systemRequired":boolean,"businessProcessRequired":boolean,"suppressedField":boolean,"legalRegulatoryImplications":string,"securityClassification":string,"referenceTable":string,"groupingTab":string,"piiType":string,"securityControls":string}]',
      'Do not include markdown, prose, comments, or wrapper keys.',
    ].join('\n');

    const compactFields = compactMetadataContext(fieldsResult.rows);
    const groundedTableSet = new Set(
      compactFields
        .map((row: any) => String(row?.table_name || '').trim().toUpperCase())
        .filter(Boolean)
    );
    const sapApplication = isSapApplication(
      String(definition.application_name || ''),
      String(definition.vendor || ''),
      String(definition.version || '')
    );
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
      'Strict Scope Rule: include ONLY tables and fields belonging to the selected application above.',
      'Exclude tables/fields that belong to any other application or platform.',
      ...(targetTableName ? [`Target Table: ${targetTableName} — generate fields ONLY for this specific table.`] : []),
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
      targetTableName
        ? `Instruction: Return ONLY fields for the table "${targetTableName}". Cover ALL columns of this table as completely as possible.`
        : 'Instruction: Return the COMPLETE field list for all relevant tables in this application/sub-object scope.',
    ].join('\n');

    const runAiProposal = async (maxTokens: number, requestedTimeoutMs: number) => {
      const remaining = remainingBudgetMs();
      // Keep a small reserve for parse/merge/response write before Heroku's 30s cap.
      const timeoutMs = Math.min(requestedTimeoutMs, Math.max(2500, remaining - 1500));
      if (timeoutMs < 2500 || remaining < 3500) {
        throw new ApiError(504, 'AI provider request timed out before completion', 'AI_PROVIDER_TIMEOUT');
      }

      return aiExecutionService.execute({
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
    };

    let executionResult;
    try {
      executionResult = await runAiProposal(700, 13000);
    } catch (error) {
      if (!isProviderTimeoutError(error)) {
        throw error;
      }
      executionResult = await runAiProposal(380, 7000);
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

    if (discoveredTables.length > 0 && firstPassProposals.length < 30 && remainingBudgetMs() > 9000) {
      const expansionUserPrompt = [
        `Data Object: ${definition.object_id}`,
        `Sub-object: ${definition.sub_object_name || definition.object_id}`,
        `Application: ${definition.application_name}`,
        `Target tables: ${discoveredTables.join(', ')}`,
        'Strict Scope Rule: include ONLY tables/fields for the selected application. Exclude all other applications.',
        '',
        'Existing fields already proposed (do not repeat these):',
        JSON.stringify(firstPassProposals.map((row: any) => ({ tableName: row.tableName || row.table || '', fieldName: row.fieldName })), null, 2),
        '',
        'Return ADDITIONAL missing fields only for the target tables.',
        'Ensure all narrative and governance attributes are application-specific and non-generic.',
        'Prioritize operational, status, address, tax, credit, company code, audit, integration, and control fields.',
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
            maxTokens: 520,
            timeoutMs: Math.min(6000, Math.max(2500, remainingBudgetMs() - 1500)),
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
    const minFieldsPerTable = sapApplication ? 24 : 40;
    const thinTables = discoveredTables
      .map((table) => String(table || '').trim().toUpperCase())
      .filter(Boolean)
      .filter((table) => (tableCounts.get(table) || 0) < minFieldsPerTable)
      .slice(0, 1);

    for (const tableName of thinTables) {
      let tablePasses = 0;
      while (remainingBudgetMs() > 7000 && tablePasses < 2) {
        const existingForTable = proposals
          .filter((row: any) => String(row.tableName || row.table || '').trim().toUpperCase() === tableName)
          .map((row: any) => String(row.fieldName || '').trim())
          .filter(Boolean);

        const needed = Math.max(10, minFieldsPerTable - existingForTable.length);
        if (needed <= 0) {
          break;
        }

        const tableExpansionPrompt = [
          `Data Object: ${definition.object_id}`,
          `Application: ${definition.application_name}`,
          `Target table: ${tableName}`,
          `Need at least ${needed} ADDITIONAL missing fields for this table.`,
          'Strict Scope Rule: include ONLY the selected application and this target table.',
          '',
          'Existing fields already captured for this table (do not repeat):',
          JSON.stringify(existingForTable, null, 2),
          '',
          'Return only additional fields for this table.',
          'Maximize field coverage for this table and continue until as complete as possible.',
          'If needed to fit more rows, keep narrative attributes concise and concrete.',
          'Do not output fields from other tables or applications.',
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
              maxTokens: 620,
              timeoutMs: Math.min(6000, Math.max(2500, remainingBudgetMs() - 1500)),
            },
          });

          const beforeCount = existingForTable.length;
          const tableParsed = parseAiJson(extractAiText(tableResult));
          const tableProposals = Array.isArray(tableParsed)
            ? tableParsed
              .map((row: any, index: number) => normalizeAiFieldProposal(row, index + proposals.length))
              .filter((row: any) => row.fieldName)
              .map((row: any) => ({ ...row, tableName: row.tableName || tableName, table: row.table || tableName }))
            : [];

          proposals = mergeUniqueProposals(proposals, tableProposals);

          const afterCount = proposals
            .filter((row: any) => String(row.tableName || row.table || '').trim().toUpperCase() === tableName)
            .length;

          tablePasses += 1;
          if (afterCount <= beforeCount) {
            break;
          }
        } catch (error) {
          if (!isProviderTimeoutError(error)) {
            throw error;
          }
          // Keep current proposals if table-level enrichment times out.
          break;
        }
      }
    }

    // Deterministic safety net for key SAP customer master tables when AI depth is constrained.
    if (sapApplication) {
      proposals = applySapFallbackCoverage(proposals);
    }
    proposals = enrichIncompleteMetadataFromFallback(proposals);
    proposals = hydrateProposalMetadata(proposals);
    proposals = filterToSelectedApplicationScope(proposals, {
      isSap: sapApplication,
      groundedTables: groundedTableSet,
    });

    res.json(formatSingleResponse({
      proposals,
      usage: executionResult?.usage || null,
      selection: executionResult?.selection || null,
    }));
  } catch (err) { next(err); }
});

router.post('/data-definitions/:definitionId/ai-generate-tables', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const definitionResult = await db.query(
      `SELECT dd.id, dd.global_object_id, dd.application_id, dd.object_sub_object_id,
              go.object_id, go.description AS object_description, go.process_area,
              go.default_gateway_id, go.default_router_id,
              app.name AS application_name, app.vendor, app.version,
              so.name AS sub_object_name
       FROM data_definitions dd
       JOIN global_objects go ON go.id = dd.global_object_id
       JOIN applications app ON app.id = dd.application_id
       LEFT JOIN object_sub_objects so ON so.id = dd.object_sub_object_id
       WHERE dd.id = $1`,
      [req.params.definitionId]
    );

    if (!definitionResult.rows.length) {
      throw new ApiError(404, 'Data definition not found', 'NOT_FOUND');
    }

    const definition = definitionResult.rows[0];

    const systemPrompt = [
      'You are an ERP and enterprise application integration specialist.',
      'Given a data object and application context, identify the physical database tables in that application that are relevant to managing this data object.',
      '',
      'Output format:',
      'Return ONLY a JSON array of table objects with this exact shape:',
      '[{"tableName":string,"description":string,"purpose":string}]',
      'tableName: the physical table name in the application (e.g. F0101, KNA1, CUSTOMERS)',
      'description: a concise description of what this table stores',
      'purpose: one of Primary, Reference, Extension, or Audit — how this table relates to the data object',
      '',
      'Include primary tables, key reference tables, and extension tables.',
      'Return between 3 and 12 tables. Prioritize the most important tables first.',
      'Do not include markdown, prose, comments, or wrapper keys.',
    ].join('\n');

    const userPrompt = [
      `Data Object: ${definition.object_id}`,
      `Sub-object: ${definition.sub_object_name || 'null'}`,
      `Application: ${definition.application_name}`,
      `Vendor: ${definition.vendor || ''}`,
      `Version: ${definition.version || ''}`,
      `Process Area: ${definition.process_area || ''}`,
      `Object Description: ${definition.object_description || ''}`,
      '',
      'Return the relevant physical tables in this application for managing this data object.',
    ].join('\n');

    const executionResult = await aiExecutionService.execute({
      gatewayId: definition.default_gateway_id || undefined,
      routerId: definition.default_router_id || undefined,
      payload: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens: 600,
        timeoutMs: 15000,
      },
    });

    const aiText = extractAiText(executionResult);
    const parsed = parseAiJson(aiText);
    const proposals = Array.isArray(parsed)
      ? parsed.filter((row: any) => String(row?.tableName || '').trim())
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
