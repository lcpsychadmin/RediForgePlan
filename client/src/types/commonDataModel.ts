export interface CommonDataModel {
  id: string;
  globalObjectId: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanonicalAttribute {
  id: string;
  commonDataModelId: string;
  canonicalAttributeName: string;
  canonicalDescription?: string | null;
  canonicalDataType?: string | null;
  canonicalLength?: number | null;
  canonicalBusinessRules?: string | null;
  relationships?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
