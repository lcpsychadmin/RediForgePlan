export interface DataDefinitionFieldMetadata {
  sourceType?: 'application' | 'databricks' | 'ai';
  aiGenerated?: boolean;
  metadataSync?: {
    source?: string;
    catalog?: string;
    schema?: string;
    table?: string;
    subObjectId?: string | null;
    syncedAt?: string;
  };
  application?: {
    table?: string | null;
  };
  databricks?: {
    table?: string | null;
    field?: string | null;
  };
  tableName?: string;
  fieldDescription?: string;
  applicationUsage?: string;
  businessDefinition?: string;
  businessRules?: string;
  fieldType?: string;
  fieldLength?: string | number | null;
  decimalPlaces?: string | number | null;
  systemRequired?: boolean;
  businessProcessRequired?: boolean;
  suppressedField?: boolean;
  legalRegulatoryImplications?: string;
  securityClassification?: string;
  referenceTable?: string;
  groupingTab?: string;
  piiType?: string;
  securityControls?: string;
  [key: string]: any;
}

export interface DataDefinitionFieldFormValues {
  fieldName: string;
  label: string;
  table: string;
  tableName: string;
  fieldDescription: string;
  applicationUsage: string;
  businessDefinition: string;
  businessRules: string;
  fieldType: string;
  fieldLength: string;
  decimalPlaces: string;
  isKey: boolean;
  systemRequired: boolean;
  businessProcessRequired: boolean;
  suppressedField: boolean;
  legalRegulatoryImplications: string;
  securityClassification: string;
  referenceTable: string;
  groupingTab: string;
  piiType: string;
  securityControls: string;
  databricksTable: string;
  databricksField: string;
}

export interface AiDataDefinitionProposalField {
  id: string;
  fieldName: string;
  label: string;
  table: string;
  tableName: string;
  fieldDescription: string;
  applicationUsage: string;
  businessDefinition: string;
  businessRules: string;
  fieldType: string;
  fieldLength: number | null;
  decimalPlaces: number | null;
  isKey: boolean;
  systemRequired: boolean;
  businessProcessRequired: boolean;
  suppressedField: boolean;
  legalRegulatoryImplications: string;
  securityClassification: string;
  referenceTable: string;
  groupingTab: string;
  piiType: string;
  securityControls: string;
}

export const SECURITY_CLASSIFICATION_OPTIONS = [
  'Public',
  'Internal',
  'Confidential',
  'Restricted',
] as const;

export const PII_TYPE_OPTIONS = [
  'None',
  'Name',
  'Address',
  'Email',
  'Phone',
  'Government ID',
  'Financial',
  'Health',
  'Other',
] as const;

export const FIELD_TYPE_OPTIONS = [
  'CHAR',
  'VARCHAR',
  'NCHAR',
  'NVARCHAR',
  'TEXT',
  'INT',
  'BIGINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'BOOLEAN',
  'JSON',
] as const;

export const createEmptyFieldFormValues = (): DataDefinitionFieldFormValues => ({
  fieldName: '',
  label: '',
  table: '',
  tableName: '',
  fieldDescription: '',
  applicationUsage: '',
  businessDefinition: '',
  businessRules: '',
  fieldType: '',
  fieldLength: '',
  decimalPlaces: '',
  isKey: false,
  systemRequired: false,
  businessProcessRequired: false,
  suppressedField: false,
  legalRegulatoryImplications: '',
  securityClassification: '',
  referenceTable: '',
  groupingTab: '',
  piiType: '',
  securityControls: '',
  databricksTable: '',
  databricksField: '',
});
