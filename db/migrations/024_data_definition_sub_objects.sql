-- Migration 024: Sub-objects within a data definition
-- When an object/application pair has sub-objects, each sub-object gets its
-- own set of fields. When no sub-objects exist, fields live at the root level
-- (sub_object_id = NULL).

CREATE TABLE data_definition_sub_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_definition_id UUID NOT NULL REFERENCES data_definitions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(data_definition_id, name)
);

CREATE INDEX idx_ddso_definition ON data_definition_sub_objects(data_definition_id);

-- Link fields to a sub-object (NULL = root-level field, no sub-objects)
ALTER TABLE data_definition_fields
  ADD COLUMN sub_object_id UUID REFERENCES data_definition_sub_objects(id) ON DELETE CASCADE;

CREATE INDEX idx_ddf_subobject ON data_definition_fields(sub_object_id);
