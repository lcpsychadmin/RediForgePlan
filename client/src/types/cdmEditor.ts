export interface CdmFieldEditorRow {
  id: string;
  selected: boolean;
  fieldName: string;
  dataType: string;
  lengthPrecision: string;
  nullable: boolean;
  description: string;
  businessRule: string;
  transformationHint: string;
  sourceExamples: string;
}
