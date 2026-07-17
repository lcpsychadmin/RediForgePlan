-- Align backend model structures for Object/Application/ApplicationSchema/Mapping/CDMAttribute

-- Object model: ensure legacy canonical table is gone.
DROP TABLE IF EXISTS canonical_attributes CASCADE;

-- ApplicationSchema model
CREATE TABLE IF NOT EXISTS application_schemas (
  application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed schema rows from applications metadata where available.
INSERT INTO application_schemas (application_id, tables, fields)
SELECT a.id,
       COALESCE(a.tables_metadata, '[]'::jsonb),
       COALESCE(a.fields_metadata, '[]'::jsonb)
FROM applications a
WHERE NOT EXISTS (
  SELECT 1 FROM application_schemas s WHERE s.application_id = a.id
);

-- Mapping model extensions
ALTER TABLE data_definitions
  ADD COLUMN IF NOT EXISTS mapped_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mapped_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS application_usage TEXT,
  ADD COLUMN IF NOT EXISTS business_rules TEXT;

-- CDMAttribute model extensions
ALTER TABLE cdm_attributes
  ADD COLUMN IF NOT EXISTS governance JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS security JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_rules JSONB NOT NULL DEFAULT '[]'::jsonb;
