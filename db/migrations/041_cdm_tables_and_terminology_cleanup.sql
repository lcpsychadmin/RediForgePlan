-- Migration 041: CDM tables and terminology cleanup

ALTER TABLE IF EXISTS common_data_model
  ADD COLUMN IF NOT EXISTS object_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS cdm_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_data_model_id UUID NOT NULL REFERENCES common_data_model(id) ON DELETE CASCADE,
  attribute_name VARCHAR(255) NOT NULL,
  attribute_description TEXT,
  data_type VARCHAR(120),
  length INT,
  business_rules TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cdm_attributes_model ON cdm_attributes(common_data_model_id);
CREATE INDEX IF NOT EXISTS idx_cdm_attributes_sort ON cdm_attributes(common_data_model_id, sort_order);

CREATE TABLE IF NOT EXISTS cdm_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_data_model_id UUID NOT NULL REFERENCES common_data_model(id) ON DELETE CASCADE,
  source_attribute_id UUID REFERENCES cdm_attributes(id) ON DELETE SET NULL,
  source_attribute_name VARCHAR(255),
  target_object_name VARCHAR(255) NOT NULL,
  target_attribute_name VARCHAR(255),
  relationship_type VARCHAR(120),
  business_rules TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cdm_relationships_model ON cdm_relationships(common_data_model_id);
CREATE INDEX IF NOT EXISTS idx_cdm_relationships_sort ON cdm_relationships(common_data_model_id, sort_order);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'canonical_attributes'
  ) THEN
    INSERT INTO cdm_attributes (
      common_data_model_id,
      attribute_name,
      attribute_description,
      data_type,
      length,
      business_rules,
      sort_order,
      created_at,
      updated_at
    )
    SELECT
      ca.common_data_model_id,
      ca.canonical_attribute_name,
      ca.canonical_description,
      ca.canonical_data_type,
      ca.canonical_length,
      ca.canonical_business_rules,
      ca.sort_order,
      ca.created_at,
      ca.updated_at
    FROM canonical_attributes ca
    WHERE NOT EXISTS (
      SELECT 1
      FROM cdm_attributes cdm
      WHERE cdm.common_data_model_id = ca.common_data_model_id
        AND cdm.attribute_name = ca.canonical_attribute_name
    );

    INSERT INTO cdm_relationships (
      common_data_model_id,
      source_attribute_name,
      target_object_name,
      relationship_type,
      business_rules,
      sort_order,
      created_at,
      updated_at
    )
    SELECT
      ca.common_data_model_id,
      ca.canonical_attribute_name,
      COALESCE(NULLIF(TRIM(ca.relationships), ''), 'Unspecified Target'),
      'legacy',
      ca.canonical_business_rules,
      ca.sort_order,
      ca.created_at,
      ca.updated_at
    FROM canonical_attributes ca
    WHERE ca.relationships IS NOT NULL
      AND TRIM(ca.relationships) <> '';
  END IF;
END $$;

DROP TABLE IF EXISTS canonical_attributes CASCADE;
DROP TABLE IF EXISTS construction_template_fields CASCADE;
DROP TABLE IF EXISTS construction_templates CASCADE;
