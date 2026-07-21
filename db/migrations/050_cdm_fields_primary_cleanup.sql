-- Migration 050: Make cdm_fields the primary canonical CDM store
-- Removes legacy cdm_attributes dependencies.

ALTER TABLE IF EXISTS cdm_relationships
  DROP CONSTRAINT IF EXISTS cdm_relationships_source_attribute_id_fkey;

ALTER TABLE IF EXISTS cdm_fields
  DROP CONSTRAINT IF EXISTS cdm_fields_cdm_attribute_id_fkey;

ALTER TABLE IF EXISTS cdm_fields
  DROP COLUMN IF EXISTS cdm_attribute_id;

ALTER TABLE IF EXISTS cdm_relationships
  ADD CONSTRAINT cdm_relationships_source_attribute_id_fkey
  FOREIGN KEY (source_attribute_id)
  REFERENCES cdm_fields(id)
  ON DELETE SET NULL;

DROP TABLE IF EXISTS cdm_attributes CASCADE;
