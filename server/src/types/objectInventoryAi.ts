export type AiRoutingOptions = {
  modelId?: string;
  gatewayId?: string;
  routerId?: string;
  policyId?: string;
  timeoutMs?: number;
};

export type ApplicationFieldInput = {
  applicationId: string;
  applicationName?: string;
  tableName: string;
  fieldName: string;
  fieldLabel?: string;
  dataType?: string;
  length?: number | null;
  decimals?: number | null;
  description?: string;
  isKey?: boolean;
  isRequired?: boolean;
  metadata?: Record<string, unknown>;
};

export type ApplicationTableInput = {
  applicationId: string;
  applicationName?: string;
  vendor?: string;
  tableName: string;
  schemaName?: string;
  description?: string;
  fields: ApplicationFieldInput[];
};

export type ApplicationSchemaInput = {
  applicationId: string;
  applicationName?: string;
  vendor?: string;
  tables: ApplicationTableInput[];
};

export type ProposeSubObjectsRequest = {
  objectName: string;
  objectDescription?: string;
  applications: ApplicationSchemaInput[];
  maxSubObjects?: number;
  ai?: AiRoutingOptions;
};

export type SubObjectProposal = {
  name: string;
  description: string;
  reasoning: string;
  sourceApplications: string[];
  sourceTables: string[];
};

export type ProposeSubObjectsResult = {
  subObjects: SubObjectProposal[];
  warnings: string[];
};

export type DeriveCdmFieldsRequest = {
  objectName: string;
  subObjectName?: string;
  tables: ApplicationTableInput[];
  ai?: AiRoutingOptions;
};

export type CdmFieldProposal = {
  fieldName: string;
  description: string;
  dataType: string;
  length?: number | null;
  required: boolean;
  aliases: string[];
  sourceFields: string[];
};

export type DeriveCdmFieldsResult = {
  cdmFields: CdmFieldProposal[];
  warnings: string[];
};

export type SuggestMappingsRequest = {
  objectName: string;
  sourceFields: ApplicationFieldInput[];
  cdmFields: CdmFieldProposal[];
  ai?: AiRoutingOptions;
};

export type FieldMappingSuggestion = {
  sourceFieldName: string;
  sourceTableName: string;
  cdmFieldName: string;
  confidence: number;
  rationale: string;
  transformRule?: string;
  matchType?: 'exact' | 'semantic' | 'derived' | 'manual_review';
};

export type SuggestMappingsResult = {
  mappings: FieldMappingSuggestion[];
  unmappedSourceFields: string[];
  warnings: string[];
};
