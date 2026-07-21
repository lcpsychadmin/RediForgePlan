import React from 'react';
import type { AiCdmFieldProposal } from '../types/objectAi';
import type { CdmFieldEditorRow } from '../types/cdmEditor';

const makeId = () => `cdm-row-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const parseRule = (rules: string[], prefix: string) => {
  const hit = rules.find((rule) => rule.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : '';
};

export const mapAttributesToEditorRows = (attributes: any[]): CdmFieldEditorRow[] => {
  return (attributes || []).map((attr: any) => {
    const validationRules = Array.isArray(attr?.validationRules)
      ? attr.validationRules.map((rule: any) => String(rule || ''))
      : [];

    const businessRule = String(attr?.businessRules || '').trim();

    return {
      id: String(attr?.id || makeId()),
      selected: false,
      fieldName: String(attr?.attributeName || attr?.name || '').trim(),
      dataType: String(attr?.dataType || 'string').trim(),
      lengthPrecision: attr?.length == null ? '' : String(attr.length),
      nullable: !(attr?.required === true),
      description: String(attr?.attributeDescription || attr?.definition || '').trim(),
      businessRule: businessRule || validationRules.find((rule) => !rule.startsWith('TRANSFORMATION_HINT:') && !rule.startsWith('SOURCE_EXAMPLES:')) || '',
      transformationHint: parseRule(validationRules, 'TRANSFORMATION_HINT:'),
      sourceExamples: parseRule(validationRules, 'SOURCE_EXAMPLES:'),
    };
  }).filter((row) => row.fieldName);
};

export const mapAiProposalsToEditorRows = (proposals: AiCdmFieldProposal[]): CdmFieldEditorRow[] => {
  return (proposals || []).map((proposal) => ({
    id: makeId(),
    selected: false,
    fieldName: String(proposal.fieldName || '').trim(),
    dataType: String(proposal.dataType || 'string').trim(),
    lengthPrecision: proposal.length == null ? '' : String(proposal.length),
    nullable: !proposal.required,
    description: String(proposal.description || '').trim(),
    businessRule: '',
    transformationHint: '',
    sourceExamples: (proposal.sourceFields || []).join(', '),
  })).filter((row) => row.fieldName);
};

export const useCdmFieldsEditor = () => {
  const [rows, setRows] = React.useState<CdmFieldEditorRow[]>([]);

  const initializeRows = React.useCallback((nextRows: CdmFieldEditorRow[]) => {
    setRows(nextRows);
  }, []);

  const addRow = React.useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: makeId(),
        selected: false,
        fieldName: '',
        dataType: 'string',
        lengthPrecision: '',
        nullable: true,
        description: '',
        businessRule: '',
        transformationHint: '',
        sourceExamples: '',
      },
    ]);
  }, []);

  const removeRow = React.useCallback((rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const updateRow = React.useCallback((rowId: string, patch: Partial<CdmFieldEditorRow>) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  }, []);

  const toggleRowSelection = React.useCallback((rowId: string, selected: boolean) => {
    setRows((prev) => prev.map((row) => row.id === rowId ? { ...row, selected } : row));
  }, []);

  const toggleAllSelection = React.useCallback((selected: boolean) => {
    setRows((prev) => prev.map((row) => ({ ...row, selected })));
  }, []);

  const bulkDeleteSelected = React.useCallback(() => {
    setRows((prev) => prev.filter((row) => !row.selected));
  }, []);

  const bulkSetNullable = React.useCallback((nullable: boolean) => {
    setRows((prev) => prev.map((row) => row.selected ? { ...row, nullable } : row));
  }, []);

  const applyAiSuggestions = React.useCallback((proposals: AiCdmFieldProposal[]) => {
    setRows((prev) => {
      const existing = new Set(prev.map((row) => row.fieldName.trim().toLowerCase()));
      const mapped = mapAiProposalsToEditorRows(proposals).filter((row) => !existing.has(row.fieldName.toLowerCase()));
      return [...prev, ...mapped];
    });
  }, []);

  const toJson = React.useCallback(() => {
    return JSON.stringify(
      rows.map((row) => ({
        fieldName: row.fieldName,
        dataType: row.dataType,
        lengthPrecision: row.lengthPrecision,
        nullable: row.nullable,
        description: row.description,
        businessRule: row.businessRule,
        transformationHint: row.transformationHint,
        sourceExamples: row.sourceExamples,
      })),
      null,
      2
    );
  }, [rows]);

  const toSql = React.useCallback((tableName: string = 'cdm_fields_export') => {
    const statements = rows
      .filter((row) => row.fieldName.trim())
      .map((row) => {
        const values = {
          field_name: row.fieldName,
          data_type: row.dataType,
          length_precision: row.lengthPrecision,
          nullable: row.nullable,
          description: row.description,
          business_rule: row.businessRule,
          transformation_hint: row.transformationHint,
          source_examples: row.sourceExamples,
        };

        const quoted = Object.values(values).map((value) => {
          if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
          }
          return `'${String(value || '').replace(/'/g, "''")}'`;
        });

        return `INSERT INTO ${tableName} (field_name, data_type, length_precision, nullable, description, business_rule, transformation_hint, source_examples) VALUES (${quoted.join(', ')});`;
      });

    return statements.join('\n');
  }, [rows]);

  const selectedCount = rows.filter((row) => row.selected).length;

  return {
    rows,
    setRows,
    selectedCount,
    initializeRows,
    addRow,
    removeRow,
    updateRow,
    toggleRowSelection,
    toggleAllSelection,
    bulkDeleteSelected,
    bulkSetNullable,
    applyAiSuggestions,
    toJson,
    toSql,
  };
};
