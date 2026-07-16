-- Migration 046: Move object modeling hierarchy to
-- Data Object -> Sub Object -> Application -> Data Definition.

CREATE TABLE IF NOT EXISTS object_sub_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_object_id UUID NOT NULL REFERENCES global_objects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(global_object_id, name)
);

CREATE INDEX IF NOT EXISTS idx_object_sub_objects_object ON object_sub_objects(global_object_id);
CREATE INDEX IF NOT EXISTS idx_object_sub_objects_sort ON object_sub_objects(global_object_id, sort_order);

ALTER TABLE data_definitions
  ADD COLUMN IF NOT EXISTS object_sub_object_id UUID REFERENCES object_sub_objects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_data_definitions_sub_object ON data_definitions(object_sub_object_id);

ALTER TABLE common_data_model
  ADD COLUMN IF NOT EXISTS object_sub_object_id UUID REFERENCES object_sub_objects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_common_data_model_sub_object ON common_data_model(object_sub_object_id);

ALTER TABLE data_definitions
  DROP CONSTRAINT IF EXISTS data_definitions_global_object_id_application_id_key;

DROP INDEX IF EXISTS idx_data_definitions_object_subobject_app_unique;
CREATE UNIQUE INDEX idx_data_definitions_object_subobject_app_unique
  ON data_definitions(
    global_object_id,
    COALESCE(object_sub_object_id, '00000000-0000-0000-0000-000000000000'::uuid),
    application_id
  );

ALTER TABLE common_data_model
  DROP CONSTRAINT IF EXISTS common_data_model_global_object_id_key;

DROP INDEX IF EXISTS idx_common_data_model_object_subobject_unique;
CREATE UNIQUE INDEX idx_common_data_model_object_subobject_unique
  ON common_data_model(
    global_object_id,
    COALESCE(object_sub_object_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

INSERT INTO object_sub_objects (global_object_id, name, description, sort_order)
SELECT DISTINCT
  dd.global_object_id,
  ddso.name,
  ddso.description,
  ddso.sort_order
FROM data_definition_sub_objects ddso
JOIN data_definitions dd ON dd.id = ddso.data_definition_id
ON CONFLICT (global_object_id, name) DO NOTHING;

INSERT INTO data_definitions (global_object_id, application_id, object_sub_object_id, notes, created_at, updated_at)
SELECT
  dd.global_object_id,
  dd.application_id,
  oso.id,
  dd.notes,
  dd.created_at,
  dd.updated_at
FROM data_definition_sub_objects ddso
JOIN data_definitions dd ON dd.id = ddso.data_definition_id
JOIN object_sub_objects oso
  ON oso.global_object_id = dd.global_object_id
 AND LOWER(oso.name) = LOWER(ddso.name)
LEFT JOIN data_definitions existing
  ON existing.global_object_id = dd.global_object_id
 AND existing.application_id = dd.application_id
 AND existing.object_sub_object_id = oso.id
WHERE existing.id IS NULL;

INSERT INTO data_definition_fields (
  data_definition_id,
  sub_object_id,
  table_name,
  field_name,
  field_label,
  data_type,
  length,
  decimals,
  is_key,
  is_required,
  business_process_required,
  description,
  field_metadata,
  sort_order,
  created_at,
  updated_at
)
SELECT
  new_dd.id,
  NULL,
  field.table_name,
  field.field_name,
  field.field_label,
  field.data_type,
  field.length,
  field.decimals,
  field.is_key,
  field.is_required,
  field.business_process_required,
  field.description,
  field.field_metadata,
  field.sort_order,
  field.created_at,
  field.updated_at
FROM data_definition_fields field
JOIN data_definition_sub_objects ddso ON ddso.id = field.sub_object_id
JOIN data_definitions old_dd ON old_dd.id = ddso.data_definition_id
JOIN object_sub_objects oso
  ON oso.global_object_id = old_dd.global_object_id
 AND LOWER(oso.name) = LOWER(ddso.name)
JOIN data_definitions new_dd
  ON new_dd.global_object_id = old_dd.global_object_id
 AND new_dd.application_id = old_dd.application_id
 AND new_dd.object_sub_object_id = oso.id
LEFT JOIN data_definition_fields existing_field
  ON existing_field.data_definition_id = new_dd.id
 AND LOWER(existing_field.field_name) = LOWER(field.field_name)
 AND COALESCE(existing_field.table_name, '') = COALESCE(field.table_name, '')
WHERE existing_field.id IS NULL;