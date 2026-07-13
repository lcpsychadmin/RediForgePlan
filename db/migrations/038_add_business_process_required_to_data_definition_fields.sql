-- Migration 038: Add business process required marker to data definition fields

ALTER TABLE data_definition_fields
  ADD COLUMN IF NOT EXISTS business_process_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ddf_business_process_required
  ON data_definition_fields(data_definition_id, business_process_required);
