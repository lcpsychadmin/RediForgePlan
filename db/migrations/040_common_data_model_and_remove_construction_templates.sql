-- Migration 040: Common Data Model support + remove legacy construction template tables

CREATE TABLE IF NOT EXISTS common_data_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_object_id UUID NOT NULL UNIQUE REFERENCES global_objects(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_common_data_model_object ON common_data_model(global_object_id);

CREATE TABLE IF NOT EXISTS canonical_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_data_model_id UUID NOT NULL REFERENCES common_data_model(id) ON DELETE CASCADE,
  canonical_attribute_name VARCHAR(255) NOT NULL,
  canonical_description TEXT,
  canonical_data_type VARCHAR(120),
  canonical_length INT,
  canonical_business_rules TEXT,
  relationships TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_canonical_attributes_model ON canonical_attributes(common_data_model_id);
CREATE INDEX IF NOT EXISTS idx_canonical_attributes_sort ON canonical_attributes(common_data_model_id, sort_order);

-- Legacy cleanup (safe no-op if legacy tables were never created)
DROP TABLE IF EXISTS construction_template_fields CASCADE;
DROP TABLE IF EXISTS construction_templates CASCADE;
