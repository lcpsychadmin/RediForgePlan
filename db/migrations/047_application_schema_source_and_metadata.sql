ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS schema_source_type VARCHAR(32) NOT NULL DEFAULT 'databricks',
  ADD COLUMN IF NOT EXISTS schema_source_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tables_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fields_metadata JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE applications
SET schema_source_type = 'databricks'
WHERE schema_source_type IS NULL OR schema_source_type = '';
