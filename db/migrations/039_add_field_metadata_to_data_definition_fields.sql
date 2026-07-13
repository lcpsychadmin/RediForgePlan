-- Migration 039: Add flexible field metadata for expanded data definition attributes

ALTER TABLE data_definition_fields
  ADD COLUMN IF NOT EXISTS field_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ddf_field_metadata_gin
  ON data_definition_fields USING gin (field_metadata);