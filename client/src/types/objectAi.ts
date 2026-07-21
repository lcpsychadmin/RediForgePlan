export interface AiSubObjectProposal {
  name: string;
  description: string;
  confidenceScore: number;
  explanation: string;
  sourceApplications: string[];
  sourceTables: string[];
}

export interface AiCdmFieldProposal {
  fieldName: string;
  description: string;
  dataType: string;
  length: number | null;
  required: boolean;
  aliases: string[];
  sourceFields: string[];
  confidenceScore: number;
  explanation: string;
}

export interface AiMappingSuggestion {
  sourceFieldName: string;
  sourceTableName: string;
  cdmFieldName: string;
  confidenceScore: number;
  explanation: string;
  transformRule: string | null;
  matchType: 'exact' | 'semantic' | 'derived' | 'manual_review' | string;
}

export interface SourceFieldInput {
  applicationId: string;
  applicationName?: string;
  tableName: string;
  fieldName: string;
  fieldLabel?: string;
  dataType?: string;
  length?: number | null;
  decimals?: number | null;
  description?: string;
}

export interface CdmFieldInput {
  fieldName: string;
  description: string;
  dataType: string;
  length?: number | null;
  required?: boolean;
  aliases?: string[];
  sourceFields?: string[];
}
