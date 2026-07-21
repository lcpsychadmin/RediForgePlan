-- Migration 049: Core model tables for Object Inventory AI workflows
-- Adds normalized entities for ApplicationTable, ApplicationField,
-- canonical CDMField, and FieldMapping.

CREATE TABLE IF NOT EXISTS application_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  data_definition_id UUID REFERENCES data_definitions(id) ON DELETE SET NULL,
  global_object_id UUID REFERENCES global_objects(id) ON DELETE CASCADE,
  object_sub_object_id UUID REFERENCES object_sub_objects(id) ON DELETE CASCADE,
  table_schema VARCHAR(255),
  table_name VARCHAR(255) NOT NULL,
  is_source BOOLEAN NOT NULL DEFAULT TRUE,
  table_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_tables_application ON application_tables(application_id);
CREATE INDEX IF NOT EXISTS idx_application_tables_object ON application_tables(global_object_id);
CREATE INDEX IF NOT EXISTS idx_application_tables_sub_object ON application_tables(object_sub_object_id);
CREATE INDEX IF NOT EXISTS idx_application_tables_definition ON application_tables(data_definition_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_tables_unique_table
  ON application_tables(
    application_id,
    COALESCE(global_object_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(object_sub_object_id, '00000000-0000-0000-0000-000000000000'::uuid),
    LOWER(table_name)
  );

CREATE TABLE IF NOT EXISTS application_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_table_id UUID NOT NULL REFERENCES application_tables(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  data_definition_field_id UUID REFERENCES data_definition_fields(id) ON DELETE SET NULL,
  field_name VARCHAR(255) NOT NULL,
  field_label VARCHAR(255),
  data_type VARCHAR(120),
  length INT,
  decimals INT,
  is_key BOOLEAN NOT NULL DEFAULT FALSE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  field_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_fields_table ON application_fields(application_table_id);
CREATE INDEX IF NOT EXISTS idx_application_fields_application ON application_fields(application_id);
CREATE INDEX IF NOT EXISTS idx_application_fields_definition_field ON application_fields(data_definition_field_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_application_fields_unique_name
  ON application_fields(application_table_id, LOWER(field_name));

CREATE TABLE IF NOT EXISTS cdm_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_data_model_id UUID NOT NULL REFERENCES common_data_model(id) ON DELETE CASCADE,
  cdm_attribute_id UUID REFERENCES cdm_attributes(id) ON DELETE SET NULL,
  global_object_id UUID NOT NULL REFERENCES global_objects(id) ON DELETE CASCADE,
  object_sub_object_id UUID REFERENCES object_sub_objects(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_description TEXT,
  data_type VARCHAR(120),
  length INT,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  governance JSONB NOT NULL DEFAULT '{}'::jsonb,
  security JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cdm_fields_model ON cdm_fields(common_data_model_id);
CREATE INDEX IF NOT EXISTS idx_cdm_fields_object ON cdm_fields(global_object_id);
CREATE INDEX IF NOT EXISTS idx_cdm_fields_sub_object ON cdm_fields(object_sub_object_id);
CREATE INDEX IF NOT EXISTS idx_cdm_fields_attribute ON cdm_fields(cdm_attribute_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdm_fields_unique_name
  ON cdm_fields(common_data_model_id, LOWER(field_name));

CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_field_id UUID NOT NULL REFERENCES application_fields(id) ON DELETE CASCADE,
  cdm_field_id UUID NOT NULL REFERENCES cdm_fields(id) ON DELETE CASCADE,
  mapping_status VARCHAR(30) NOT NULL DEFAULT 'proposed',
  confidence_score NUMERIC(5,4),
  rationale TEXT,
  source_type VARCHAR(30) NOT NULL DEFAULT 'ai',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT field_mappings_confidence_range
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_app_field ON field_mappings(application_field_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_cdm_field ON field_mappings(cdm_field_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_status ON field_mappings(mapping_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_unique_pair
  ON field_mappings(application_field_id, cdm_field_id);