import React from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import AiCdmFieldProposalPanel from '../../../components/objects/AiCdmFieldProposalPanel';
import { useAiCdmDerivation } from '../../../hooks/useObjectAiActions';
import type { AiCdmFieldProposal } from '../../../types/objectAi';
import CdmFieldsEditorTable from '../../../components/objects/CdmFieldsEditorTable';
import { mapAttributesToEditorRows, useCdmFieldsEditor } from '../../../hooks/useCdmFieldsEditor';
import type { CdmFieldEditorRow } from '../../../types/cdmEditor';

type FieldRow = {
  id: string;
  definitionId: string;
  applicationId: string;
  applicationName: string;
  vendor?: string | null;
  version?: string | null;
  field_name?: string;
  field_label?: string;
  table_name?: string;
  data_type?: string;
  length?: number | null;
  decimals?: number | null;
  is_key?: boolean;
  is_required?: boolean;
  business_process_required?: boolean;
  description?: string | null;
  field_metadata?: any;
};

type CdmAttributeRow = {
  attributeName: string;
  description: string;
  dataType: string;
  requiredPct: number;
  sourceCount: number;
  sourceTables: string[];
};

const toDisplayName = (value: string) => {
  const cleaned = String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const resolveSourceType = (field: any): 'application' | 'databricks' | 'other' => {
  const sourceType = String(field?.field_metadata?.sourceType || '').toLowerCase();
  if (sourceType === 'application') return 'application';
  if (sourceType === 'databricks' || field?.field_metadata?.metadataSync) return 'databricks';
  return 'other';
};

const getMetaText = (field: any, key: string): string => {
  const metadata = field?.field_metadata && typeof field.field_metadata === 'object' ? field.field_metadata : {};
  return String(metadata[key] || '').trim();
};

const getApplicationTable = (field: any): string => {
  const value = String(
    field?.field_metadata?.application?.table
    || field?.field_metadata?.applicationTable
    || field?.table_name
    || ''
  ).trim();
  return value;
};

const getAttributeKey = (field: FieldRow): string => {
  const definition = getMetaText(field, 'businessDefinition');
  const label = String(field.field_label || '').trim();
  const fieldName = String(field.field_name || '').trim();
  return (definition || label || fieldName).toLowerCase();
};

const getAttributeName = (field: FieldRow): string => {
  const definition = getMetaText(field, 'businessDefinition');
  const label = String(field.field_label || '').trim();
  const fieldName = String(field.field_name || '').trim();
  return toDisplayName(definition || label || fieldName) || 'Unnamed Attribute';
};

const getAttributeDescription = (field: FieldRow): string => {
  return (
    getMetaText(field, 'businessDefinition')
    || getMetaText(field, 'fieldDescription')
    || String(field.description || '').trim()
    || 'No definition provided.'
  );
};

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ObjectCdmPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [objectSummary, setObjectSummary] = React.useState<any>(null);
  const [linkedDefs, setLinkedDefs] = React.useState<any[]>([]);
  const [allFields, setAllFields] = React.useState<FieldRow[]>([]);
  const [loadError, setLoadError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [status, setStatus] = React.useState('');
  const [statusSeverity, setStatusSeverity] = React.useState<'success' | 'error' | 'info'>('info');
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [aiCdmProposals, setAiCdmProposals] = React.useState<AiCdmFieldProposal[]>([]);
  const [persistedCdmAttributes, setPersistedCdmAttributes] = React.useState<any[]>([]);
  const [persistedCdmRelationships, setPersistedCdmRelationships] = React.useState<any[]>([]);
  const [isSavingCdmRows, setIsSavingCdmRows] = React.useState(false);

  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  const {
    run: runAiCdmDerivation,
    loading: aiDeriveLoading,
    error: aiDeriveError,
  } = useAiCdmDerivation();

  const {
    rows: cdmEditorRows,
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
  } = useCdmFieldsEditor();

  const load = React.useCallback(async () => {
    if (!objectId) return;
    if (hasSubObjects && !scopeSubObjectId) {
      setLinkedDefs([]);
      setAllFields([]);
      setPersistedCdmAttributes([]);
      setPersistedCdmRelationships([]);
      initializeRows([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const [objectRes, linkedRes, cdmRes] = await Promise.all([
        apiClient.get(`/api/global-objects/${objectId}`),
        apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
          params: { subObjectId: scopeSubObjectId },
        }),
        apiClient.get(`/api/cdm/${objectId}`, {
          params: { subObjectId: scopeSubObjectId || undefined },
        }).catch(() => ({ data: { data: { attributes: [], relationships: [] } } })),
      ]);

      const objectData = objectRes.data?.data || null;
      const definitions = Array.isArray(linkedRes.data?.data) ? linkedRes.data.data : [];

      setObjectSummary(objectData);
      setLinkedDefs(definitions);
      setPersistedCdmAttributes(Array.isArray(cdmRes.data?.data?.attributes) ? cdmRes.data.data.attributes : []);
      setPersistedCdmRelationships(Array.isArray(cdmRes.data?.data?.relationships) ? cdmRes.data.data.relationships : []);

      const fieldResults = await Promise.all(
        definitions.map((definition: any) =>
          apiClient.get(`/api/applications/data-definitions/${definition.id}/fields`)
            .then((response) => ({ definition, rows: Array.isArray(response.data?.data) ? response.data.data : [] }))
            .catch(() => ({ definition, rows: [] }))
        )
      );

      const flattened: FieldRow[] = [];
      fieldResults.forEach(({ definition, rows }) => {
        rows.forEach((field: any) => {
          flattened.push({
            ...field,
            definitionId: definition.id,
            applicationId: definition.application_id,
            applicationName: definition.application_name,
            vendor: definition.vendor,
            version: definition.version,
          });
        });
      });

      setAllFields(flattened);
    } catch {
      setLoadError('Failed to load Common Data Model Builder data.');
      setObjectSummary(null);
      setLinkedDefs([]);
      setAllFields([]);
      setPersistedCdmAttributes([]);
      setPersistedCdmRelationships([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasSubObjects, initializeRows, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    load().catch(() => {
      setLoadError('Failed to load Common Data Model Builder data.');
      setIsLoading(false);
    });
  }, [load]);

  const mappingFields = React.useMemo(
    () => allFields.filter((field) => resolveSourceType(field) === 'application'),
    [allFields]
  );

  const schemaFields = React.useMemo(
    () => allFields.filter((field) => resolveSourceType(field) === 'databricks'),
    [allFields]
  );

  const cdmAttributes = React.useMemo<CdmAttributeRow[]>(() => {
    const grouped = new Map<string, {
      attributeName: string;
      descriptions: string[];
      dataTypes: string[];
      requiredCount: number;
      total: number;
      sourceTables: Set<string>;
    }>();

    mappingFields.forEach((field) => {
      const key = getAttributeKey(field);
      if (!key) return;

      const existing = grouped.get(key) || {
        attributeName: getAttributeName(field),
        descriptions: [],
        dataTypes: [],
        requiredCount: 0,
        total: 0,
        sourceTables: new Set<string>(),
      };

      const description = getAttributeDescription(field);
      const dataType = getMetaText(field, 'fieldType') || String(field.data_type || '').trim();
      const tableName = getApplicationTable(field) || String(field.table_name || '').trim();

      if (description) existing.descriptions.push(description);
      if (dataType) existing.dataTypes.push(dataType);
      if (tableName) existing.sourceTables.add(tableName);
      if (field.is_required || field.business_process_required) existing.requiredCount += 1;
      existing.total += 1;

      grouped.set(key, existing);
    });

    return Array.from(grouped.values()).map((entry) => ({
      attributeName: entry.attributeName,
      description: entry.descriptions[0] || 'No definition provided.',
      dataType: entry.dataTypes[0] || 'unspecified',
      requiredPct: entry.total ? Math.round((entry.requiredCount / entry.total) * 100) : 0,
      sourceCount: entry.total,
      sourceTables: Array.from(entry.sourceTables),
    })).sort((a, b) => a.attributeName.localeCompare(b.attributeName));
  }, [mappingFields]);

  const governanceRows = React.useMemo(() => {
    return cdmAttributes.map((row) => {
      const key = row.attributeName.toLowerCase();
      const related = mappingFields.filter((field) => getAttributeName(field).toLowerCase() === key);
      const classifications = Array.from(new Set(related.map((field) => getMetaText(field, 'securityClassification')).filter(Boolean)));
      const piiTypes = Array.from(new Set(related.map((field) => getMetaText(field, 'piiType')).filter(Boolean)));
      return {
        attributeName: row.attributeName,
        classifications,
        piiTypes,
        requiredPct: row.requiredPct,
      };
    });
  }, [cdmAttributes, mappingFields]);

  const securityRows = React.useMemo(() => {
    return cdmAttributes.map((row) => {
      const key = row.attributeName.toLowerCase();
      const related = mappingFields.filter((field) => getAttributeName(field).toLowerCase() === key);
      const controls = Array.from(new Set(related.map((field) => getMetaText(field, 'securityControls')).filter(Boolean)));
      return {
        attributeName: row.attributeName,
        controls,
      };
    });
  }, [cdmAttributes, mappingFields]);

  const validationRows = React.useMemo(() => {
    return cdmAttributes.map((row) => {
      const key = row.attributeName.toLowerCase();
      const related = mappingFields.filter((field) => getAttributeName(field).toLowerCase() === key);
      const rules = Array.from(new Set(related.map((field) => getMetaText(field, 'businessRules')).filter(Boolean)));
      const keyFlags = related.filter((field) => field.is_key).length;
      return {
        attributeName: row.attributeName,
        rules,
        keyCoverage: `${keyFlags}/${related.length || 0}`,
      };
    });
  }, [cdmAttributes, mappingFields]);

  const crossAppRows = React.useMemo(() => {
    const appNames = Array.from(new Set(linkedDefs.map((definition: any) => definition.application_name))).sort();
    const mapByAttribute = new Map<string, Map<string, { count: number; type: string }>>();

    mappingFields.forEach((field) => {
      const attributeName = getAttributeName(field);
      const appName = String(field.applicationName || '').trim();
      const dataType = getMetaText(field, 'fieldType') || String(field.data_type || '').trim() || '-';
      if (!attributeName || !appName) return;

      const appMap = mapByAttribute.get(attributeName) || new Map<string, { count: number; type: string }>();
      const current = appMap.get(appName) || { count: 0, type: dataType };
      appMap.set(appName, { count: current.count + 1, type: current.type || dataType });
      mapByAttribute.set(attributeName, appMap);
    });

    const rows = Array.from(mapByAttribute.entries())
      .map(([attributeName, appMap]) => {
        const appCoverage = appNames.map((appName) => {
          const value = appMap.get(appName);
          if (!value) return `${appName}: n/a`;
          return `${appName}: ${value.type}`;
        });
        return {
          attributeName,
          coverage: appCoverage,
          appCount: appMap.size,
        };
      })
      .sort((a, b) => a.attributeName.localeCompare(b.attributeName));

    return {
      appNames,
      rows,
    };
  }, [linkedDefs, mappingFields]);

  React.useEffect(() => {
    if (persistedCdmAttributes.length > 0) {
      initializeRows(mapAttributesToEditorRows(persistedCdmAttributes));
      return;
    }

    const fallbackRows: CdmFieldEditorRow[] = cdmAttributes.map((row, index) => ({
      id: `derived-${index}-${row.attributeName}`,
      selected: false,
      fieldName: row.attributeName,
      dataType: row.dataType,
      lengthPrecision: '',
      nullable: row.requiredPct < 100,
      description: row.description,
      businessRule: '',
      transformationHint: '',
      sourceExamples: row.sourceTables.join(', '),
    }));

    initializeRows(fallbackRows);
  }, [cdmAttributes, initializeRows, persistedCdmAttributes]);

  const handleDeriveCdmFromSources = async () => {
    if (!scopeSubObjectId) {
      setStatusSeverity('info');
      setStatus('Select a sub-object before deriving CDM fields.');
      return;
    }

    setStatus('');
    try {
      const result = await runAiCdmDerivation(scopeSubObjectId);
      setAiCdmProposals(result.proposals || []);
      setAiPanelOpen(true);
    } catch {
      // Hook exposes error via aiDeriveError.
    }
  };

  const handleApplyAiCdm = async (accepted: AiCdmFieldProposal[]) => {
    if (!accepted.length) {
      setAiPanelOpen(false);
      return;
    }

    applyAiSuggestions(accepted);
    setAiPanelOpen(false);
    setStatusSeverity('success');
    setStatus(`Added ${accepted.length} AI suggestion(s) to the CDM table. Save when ready.`);
  };

  const handleSaveCdmRows = async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setStatusSeverity('info');
      setStatus('Select a sub-object before saving CDM fields.');
      return;
    }

    setIsSavingCdmRows(true);
    setStatus('');
    try {
      await apiClient.post(`/api/cdm/${objectId}`, {
        subObjectId: scopeSubObjectId || null,
        objectName: objectSummary?.objectId || objectSummary?.object_id || null,
        notes: null,
        attributes: cdmEditorRows
          .filter((row) => row.fieldName.trim())
          .map((row, index) => {
            const lengthValue = Number(String(row.lengthPrecision || '').split(',')[0].trim());
            const validationRules = [
              row.businessRule ? row.businessRule.trim() : '',
              row.transformationHint ? `TRANSFORMATION_HINT:${row.transformationHint.trim()}` : '',
              row.sourceExamples ? `SOURCE_EXAMPLES:${row.sourceExamples.trim()}` : '',
            ].filter(Boolean);

            return {
              attributeName: row.fieldName.trim(),
              attributeDescription: row.description || null,
              dataType: row.dataType || null,
              length: Number.isFinite(lengthValue) ? lengthValue : null,
              businessRules: row.businessRule || null,
              required: !row.nullable,
              validationRules,
              sortOrder: index,
            };
          }),
        relationships: persistedCdmRelationships,
      });

      setStatusSeverity('success');
      setStatus('CDM fields saved.');
      await load();
    } catch {
      setStatusSeverity('error');
      setStatus('Failed to save CDM fields.');
    } finally {
      setIsSavingCdmRows(false);
    }
  };

  const handleExportJson = () => {
    downloadTextFile(toJson(), `cdm-fields-${objectId}.json`, 'application/json');
  };

  const handleExportSql = () => {
    downloadTextFile(toSql('cdm_fields_export'), `cdm-fields-${objectId}.sql`, 'text/sql');
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Common Data Model Builder" breadcrumbLabel="CDM Builder" />

        {(status || aiDeriveError) && (
          <Alert severity={aiDeriveError ? 'error' : statusSeverity} sx={{ mb: 2 }} onClose={() => setStatus('')}>
            {aiDeriveError || status}
          </Alert>
        )}

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>
              Layer 5: Common Data Model Builder
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              CDM output is generated from Object Inventory, Application Schema, and Object/Application Mapping.
            </Typography>

            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
            ) : hasSubObjects ? (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="CDM Builder is scoped by selected sub-object."
              />
            ) : (
              <Alert severity="info">This object has no sub-objects. CDM Builder runs at object scope.</Alert>
            )}

            {loadError && <Alert severity="error" sx={{ mt: 1.5 }}>{loadError}</Alert>}

            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleDeriveCdmFromSources}
                disabled={aiDeriveLoading || isSavingCdmRows || (hasSubObjects && !scopeSubObjectId)}
                sx={{ textTransform: 'none' }}
              >
                {aiDeriveLoading ? 'Deriving...' : 'Derive CDM from Sources'}
              </Button>
            </Box>

            {!loadError && (
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                <Chip size="small" label={`Object: ${objectSummary?.objectId || objectSummary?.object_id || objectId}`} />
                <Chip size="small" label={`Process Area: ${objectSummary?.processArea || objectSummary?.process_area || '-'}`} />
                <Chip size="small" label={`Linked Applications: ${linkedDefs.length}`} />
                <Chip size="small" label={`Schema Fields: ${schemaFields.length}`} />
                <Chip size="small" label={`Mapped Fields: ${mappingFields.length}`} />
                <Chip size="small" label={`CDM Attributes: ${cdmAttributes.length}`} />
              </Box>
            )}

            {aiPanelOpen && (
              <AiCdmFieldProposalPanel
                proposals={aiCdmProposals}
                loading={isSavingCdmRows}
                onApply={handleApplyAiCdm}
                onClose={() => setAiPanelOpen(false)}
              />
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Fields</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
              Edit canonical CDM fields, apply bulk updates, and export as JSON or SQL.
            </Typography>
            <CdmFieldsEditorTable
              rows={cdmEditorRows}
              selectedCount={selectedCount}
              saving={isSavingCdmRows}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
              onToggleRowSelection={toggleRowSelection}
              onToggleAllSelection={toggleAllSelection}
              onBulkDeleteSelected={bulkDeleteSelected}
              onBulkSetNullable={bulkSetNullable}
              onExportJson={handleExportJson}
              onExportSql={handleExportSql}
              onSave={handleSaveCdmRows}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Attributes</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
              Generated from mapped fields. Application-specific field columns are excluded.
            </Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 0.9fr 0.8fr 1fr 1.3fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Attribute Name', 'CDM Definition', 'Data Type', 'Required %', 'Source Count', 'Source Tables'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {isLoading ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">Generating CDM attributes...</Typography></Box>
              ) : cdmAttributes.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No mapped field data available for CDM attribute generation.</Typography></Box>
              ) : cdmAttributes.map((row, idx) => (
                <Box key={`${row.attributeName}-${idx}`} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 0.9fr 0.8fr 1fr 1.3fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8, fontWeight: 700 }}>{row.attributeName}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.description}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.dataType}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.requiredPct}%</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.sourceCount}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.sourceTables.join(', ') || '-'}</Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Definitions</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
              Canonical business definitions normalized from mapped field definitions.
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              {cdmAttributes.slice(0, 40).map((row) => (
                <Box key={`definition-${row.attributeName}`} sx={{ p: 1, borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }}>{row.attributeName}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.description}</Typography>
                </Box>
              ))}
              {cdmAttributes.length === 0 && <Typography color="text.secondary" variant="body2">No definitions generated yet.</Typography>}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Governance</Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Attribute', 'Security Classification', 'PII Type', 'Required %'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {governanceRows.map((row, idx) => (
                <Box key={`governance-${row.attributeName}`} sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.classifications.join(', ') || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.piiTypes.join(', ') || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.requiredPct}%</Box>
                </Box>
              ))}
              {!governanceRows.length && <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No governance rows generated.</Typography></Box>}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Security</Typography>
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              {securityRows.map((row) => (
                <Box key={`security-${row.attributeName}`} sx={{ p: 1, borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.83rem' }}>{row.attributeName}</Typography>
                  <Typography variant="body2" color="text.secondary">Controls: {row.controls.join(', ') || 'No controls specified.'}</Typography>
                </Box>
              ))}
              {!securityRows.length && <Typography color="text.secondary" variant="body2">No security data generated.</Typography>}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>CDM Validation Rules</Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Attribute', 'Validation Rules', 'Key Coverage'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {validationRows.map((row, idx) => (
                <Box key={`validation-${row.attributeName}`} sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.rules.join('; ') || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.keyCoverage}</Box>
                </Box>
              ))}
              {!validationRows.length && <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No validation rules generated.</Typography></Box>}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Cross-application Comparison</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
              Compare normalized CDM attributes across linked applications.
            </Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 2.4fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Attribute', 'Application Coverage', 'Applications'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {crossAppRows.rows.map((row, idx) => (
                <Box key={`comparison-${row.attributeName}`} sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.2fr 2.4fr 0.8fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.coverage.join(' | ')}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.appCount}</Box>
                </Box>
              ))}
              {!crossAppRows.rows.length && <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No cross-application comparison data available.</Typography></Box>}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectCdmPage;
