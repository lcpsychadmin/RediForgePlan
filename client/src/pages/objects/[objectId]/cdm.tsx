import React from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import AddEditCdmAttributeModal from '../../../components/objects/AddEditCdmAttributeModal';
import CdmAiProposalModal from '../../../components/objects/CdmAiProposalModal';
import type {
  CDMAttribute,
  CDMRelationship,
  CdmAiProposalAttribute,
  CdmAiProposalRelationship,
  CdmAttributeFormValues,
} from '../../../types/commonDataModel';

const mapCDMAttribute = (row: any): CDMAttribute => ({
  id: String(row.id || ''),
  commonDataModelId: String(row.common_data_model_id || row.commonDataModelId || ''),
  attributeName: String(row.attribute_name || row.attributeName || ''),
  attributeDescription: row.attribute_description ?? row.attributeDescription ?? null,
  dataType: row.data_type ?? row.dataType ?? null,
  length: row.length ?? null,
  businessRules: row.business_rules ?? row.businessRules ?? null,
  sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
  createdAt: row.created_at || row.createdAt,
  updatedAt: row.updated_at || row.updatedAt,
});

const mapCDMRelationship = (row: any): CDMRelationship => ({
  id: String(row.id || ''),
  commonDataModelId: String(row.common_data_model_id || row.commonDataModelId || ''),
  sourceAttributeId: row.source_attribute_id ?? row.sourceAttributeId ?? null,
  sourceAttributeName: row.source_attribute_name ?? row.sourceAttributeName ?? null,
  targetObjectName: String(row.target_object_name || row.targetObjectName || ''),
  targetAttributeName: row.target_attribute_name ?? row.targetAttributeName ?? null,
  relationshipType: row.relationship_type ?? row.relationshipType ?? null,
  businessRules: row.business_rules ?? row.businessRules ?? null,
  sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
  createdAt: row.created_at || row.createdAt,
  updatedAt: row.updated_at || row.updatedAt,
});

const mapAttributeToFormValues = (attribute: CDMAttribute): CdmAttributeFormValues => ({
  attributeName: attribute.attributeName,
  attributeDescription: attribute.attributeDescription || '',
  dataType: attribute.dataType || '',
  length: attribute.length == null ? '' : String(attribute.length),
  businessRules: attribute.businessRules || '',
});

const relationshipKey = (relationship: {
  sourceAttributeName?: string | null;
  targetObjectName?: string | null;
  targetAttributeName?: string | null;
  relationshipType?: string | null;
}) => [
  String(relationship.sourceAttributeName || '').trim().toLowerCase(),
  String(relationship.targetObjectName || '').trim().toLowerCase(),
  String(relationship.targetAttributeName || '').trim().toLowerCase(),
  String(relationship.relationshipType || '').trim().toLowerCase(),
].join('::');

const ObjectCdmPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);
  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';
  const [attributes, setAttributes] = React.useState<CDMAttribute[]>([]);
  const [relationships, setRelationships] = React.useState<CDMRelationship[]>([]);
  const [attributeModalOpen, setAttributeModalOpen] = React.useState(false);
  const [editingAttribute, setEditingAttribute] = React.useState<CDMAttribute | null>(null);
  const [proposalModalOpen, setProposalModalOpen] = React.useState(false);
  const [proposalAttributes, setProposalAttributes] = React.useState<CdmAiProposalAttribute[]>([]);
  const [proposalRelationships, setProposalRelationships] = React.useState<CdmAiProposalRelationship[]>([]);
  const [isSavingAttribute, setIsSavingAttribute] = React.useState(false);
  const [isSavingProposal, setIsSavingProposal] = React.useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState('');
  const [saveError, setSaveError] = React.useState('');

  const load = React.useCallback(async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setAttributes([]);
      setRelationships([]);
      return;
    }

    const res = await apiClient.get(`/api/cdm/${objectId}`, {
      params: { subObjectId: scopeSubObjectId },
    });
    const payload = res.data?.data || {};
    setAttributes(Array.isArray(payload.attributes) ? payload.attributes.map(mapCDMAttribute) : []);
    setRelationships(Array.isArray(payload.relationships) ? payload.relationships.map(mapCDMRelationship) : []);
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    load().catch(() => {
      setAttributes([]);
      setRelationships([]);
    });
  }, [load]);

  const persistModel = async (nextAttributes: CDMAttribute[], nextRelationships: CDMRelationship[]) => {
    if (hasSubObjects && !scopeSubObjectId) {
      throw new Error('No sub-object selected');
    }

    const response = await apiClient.post(`/api/cdm/${objectId}`, {
      objectName: objectId,
      subObjectId: scopeSubObjectId,
      attributes: nextAttributes.map((attribute, index) => ({
        attributeName: attribute.attributeName,
        attributeDescription: attribute.attributeDescription || null,
        dataType: attribute.dataType || null,
        length: attribute.length ?? null,
        businessRules: attribute.businessRules || null,
        sortOrder: index,
      })),
      relationships: nextRelationships.map((relationship, index) => ({
        sourceAttributeId: relationship.sourceAttributeId || null,
        sourceAttributeName: relationship.sourceAttributeName || null,
        targetObjectName: relationship.targetObjectName,
        targetAttributeName: relationship.targetAttributeName || null,
        relationshipType: relationship.relationshipType || null,
        businessRules: relationship.businessRules || null,
        sortOrder: index,
      })),
    });

    const payload = response.data?.data || {};
    setAttributes(Array.isArray(payload.attributes) ? payload.attributes.map(mapCDMAttribute) : []);
    setRelationships(Array.isArray(payload.relationships) ? payload.relationships.map(mapCDMRelationship) : []);
  };

  const handleSaveAttribute = async (values: CdmAttributeFormValues) => {
    const nextAttribute: CDMAttribute = {
      id: editingAttribute?.id || `local-${Date.now()}`,
      commonDataModelId: editingAttribute?.commonDataModelId || '',
      attributeName: values.attributeName,
      attributeDescription: values.attributeDescription || null,
      dataType: values.dataType || null,
      length: values.length === '' ? null : Number(values.length),
      businessRules: values.businessRules || null,
      sortOrder: editingAttribute?.sortOrder || attributes.length,
    };

    const nextAttributes = editingAttribute
      ? attributes.map((attribute) => attribute.id === editingAttribute.id ? nextAttribute : attribute)
      : [...attributes, nextAttribute];

    setIsSavingAttribute(true);
    setSaveError('');
    try {
      await persistModel(nextAttributes, relationships);
      setSaveStatus(editingAttribute ? 'Attribute updated.' : 'Attribute added.');
      setAttributeModalOpen(false);
      setEditingAttribute(null);
    } catch {
      setSaveError('Failed to save attribute. Please try again.');
    } finally {
      setIsSavingAttribute(false);
    }
  };

  const handleDeleteAttribute = async (attributeId: string) => {
    const targetAttribute = attributes.find((attribute) => attribute.id === attributeId);
    if (!targetAttribute) {
      return;
    }

    const nextAttributes = attributes.filter((attribute) => attribute.id !== attributeId);
    const nextRelationships = relationships.filter((relationship) => String(relationship.sourceAttributeName || '').trim().toLowerCase() !== targetAttribute.attributeName.trim().toLowerCase());

    setSaveError('');
    try {
      await persistModel(nextAttributes, nextRelationships);
      setSaveStatus('Attribute deleted.');
    } catch {
      setSaveError('Failed to delete attribute. Please try again.');
    }
  };

  const handleAutoBuild = async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setSaveError('Select a sub-object before running Auto-Build CDM.');
      return;
    }

    setIsGeneratingProposal(true);
    setSaveError('');
    try {
      const response = await apiClient.post(`/api/cdm/${objectId}/ai-proposal`, {
        subObjectId: scopeSubObjectId,
      });
      const payload = response.data?.data || {};
      setProposalAttributes(Array.isArray(payload.attributes) ? payload.attributes : []);
      setProposalRelationships(Array.isArray(payload.relationships) ? payload.relationships : []);
      setProposalModalOpen(true);
    } catch (error: any) {
      setSaveError(error?.response?.data?.error?.message || error?.response?.data?.message || 'Failed to generate AI CDM proposal.');
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleSaveProposal = async (proposal: {
    attributes: CdmAiProposalAttribute[];
    relationships: CdmAiProposalRelationship[];
  }) => {
    const attributeMap = new Map<string, CDMAttribute>();
    attributes.forEach((attribute) => {
      attributeMap.set(attribute.attributeName.trim().toLowerCase(), attribute);
    });
    proposal.attributes.forEach((attribute, index) => {
      attributeMap.set(attribute.attributeName.trim().toLowerCase(), {
        id: attribute.id || `proposal-attribute-${index}`,
        commonDataModelId: '',
        attributeName: attribute.attributeName,
        attributeDescription: attribute.attributeDescription || null,
        dataType: attribute.dataType || null,
        length: attribute.length ?? null,
        businessRules: attribute.businessRules || null,
        sortOrder: index,
      });
    });

    const relationshipMap = new Map<string, CDMRelationship>();
    relationships.forEach((relationship) => {
      relationshipMap.set(relationshipKey(relationship), relationship);
    });
    proposal.relationships.forEach((relationship, index) => {
      relationshipMap.set(relationshipKey(relationship), {
        id: relationship.id || `proposal-relationship-${index}`,
        commonDataModelId: '',
        sourceAttributeId: relationship.sourceAttributeId || null,
        sourceAttributeName: relationship.sourceAttributeName,
        targetObjectName: relationship.targetObjectName,
        targetAttributeName: relationship.targetAttributeName || null,
        relationshipType: relationship.relationshipType || null,
        businessRules: relationship.businessRules || null,
        sortOrder: index,
      });
    });

    setIsSavingProposal(true);
    setSaveError('');
    try {
      await persistModel(Array.from(attributeMap.values()), Array.from(relationshipMap.values()));
      setSaveStatus('AI CDM proposal saved.');
      setProposalModalOpen(false);
    } catch {
      setSaveError('Failed to save AI CDM proposal. Please try again.');
    } finally {
      setIsSavingProposal(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Common Data Model" />

        <Stack spacing={2}>
          {isLoadingSubObjects ? (
            <Typography color="text.secondary" variant="body2">Loading sub-objects...</Typography>
          ) : !hasSubObjects ? (
            <Alert severity="info">This object has no sub-objects. CDM edits apply to the object root.</Alert>
          ) : subObjects.length === 0 ? (
            <Alert severity="info">Create sub-objects on the Sub Objects tab before editing CDM.</Alert>
          ) : (
            <ObjectSubObjectSelector
              subObjects={subObjects}
              selectedSubObjectId={selectedSubObjectId}
              onChange={setSelectedSubObjectId}
              helperText={selectedSubObject ? `Editing CDM for sub-object: ${selectedSubObject.name}` : 'Select a sub-object to edit CDM.'}
            />
          )}

          {(saveStatus || saveError) && (
            <Alert severity={saveError ? 'error' : 'success'}>
              {saveError || saveStatus}
            </Alert>
          )}

          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>Attributes</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditingAttribute(null);
                      setAttributeModalOpen(true);
                    }}
                    disabled={hasSubObjects && !scopeSubObjectId}
                    sx={{ textTransform: 'none' }}
                  >
                    + Add Attribute
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleAutoBuild}
                    disabled={isGeneratingProposal || (hasSubObjects && !scopeSubObjectId)}
                    sx={{ textTransform: 'none' }}
                  >
                    {isGeneratingProposal ? 'Analyzing...' : 'Auto-Build CDM (AI)'}
                  </Button>
                </Stack>
              </Box>
              <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 0.9fr 0.6fr 1.5fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {['Attribute Name', 'Description', 'Data Type', 'Length', 'Business Rules', 'Actions'].map((header) => (
                    <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                  ))}
                </Box>
                {attributes.length === 0 ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No attributes defined.</Typography></Box>
                ) : attributes.map((row) => (
                  <Box key={row.id} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.1fr 1.6fr 0.9fr 0.6fr 1.5fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.attributeDescription || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.dataType || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.length ?? '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.businessRules || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingAttribute(row);
                          setAttributeModalOpen(true);
                        }}
                        title="Edit attribute"
                      >
                        <EditIcon sx={{ fontSize: '0.95rem' }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteAttribute(row.id)} title="Delete attribute">
                        <DeleteIcon sx={{ fontSize: '0.95rem' }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Relationships</Typography>
              <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.9fr 1.6fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {['Source Attribute', 'Target Object', 'Target Attribute', 'Relationship Type', 'Business Rules'].map((header) => (
                    <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                  ))}
                </Box>
                {relationships.length === 0 ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No relationships defined.</Typography></Box>
                ) : relationships.map((relationship) => (
                  <Box key={relationship.id} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.9fr 1.6fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8 }}>{relationship.sourceAttributeName || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{relationship.targetObjectName || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{relationship.targetAttributeName || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{relationship.relationshipType || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{relationship.businessRules || '-'}</Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Stack>

        <AddEditCdmAttributeModal
          open={attributeModalOpen}
          initialValues={editingAttribute ? mapAttributeToFormValues(editingAttribute) : undefined}
          onClose={() => {
            if (isSavingAttribute) {
              return;
            }
            setAttributeModalOpen(false);
            setEditingAttribute(null);
          }}
          onSave={handleSaveAttribute}
          saving={isSavingAttribute}
        />

        <CdmAiProposalModal
          open={proposalModalOpen}
          attributes={proposalAttributes}
          relationships={proposalRelationships}
          onClose={() => {
            if (isSavingProposal) {
              return;
            }
            setProposalModalOpen(false);
          }}
          onSave={handleSaveProposal}
          saving={isSavingProposal}
        />
      </Box>
    </Layout>
  );
};

export default ObjectCdmPage;
