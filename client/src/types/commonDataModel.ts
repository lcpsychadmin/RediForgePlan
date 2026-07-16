export interface CommonDataModel {
  id: string;
  globalObjectId: string;
  objectName?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CDMAttribute {
  id: string;
  commonDataModelId: string;
  attributeName: string;
  attributeDescription?: string | null;
  dataType?: string | null;
  length?: number | null;
  businessRules?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CDMRelationship {
  id: string;
  commonDataModelId: string;
  sourceAttributeId?: string | null;
  sourceAttributeName?: string | null;
  targetObjectName: string;
  targetAttributeName?: string | null;
  relationshipType?: string | null;
  businessRules?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CdmAttributeFormValues {
  attributeName: string;
  attributeDescription: string;
  dataType: string;
  length: string;
  businessRules: string;
}

export interface CdmAiProposalAttribute {
  id: string;
  attributeName: string;
  attributeDescription?: string | null;
  dataType?: string | null;
  length?: number | null;
  businessRules?: string | null;
  sortOrder?: number;
}

export interface CdmAiProposalRelationship {
  id: string;
  sourceAttributeId?: string | null;
  sourceAttributeName: string;
  targetObjectName: string;
  targetAttributeName?: string | null;
  relationshipType?: string | null;
  businessRules?: string | null;
  sortOrder?: number;
}
