-- Migration 023: Applications and Data Definitions
-- An object can be associated with multiple applications.
-- Each object-application pair has exactly one data definition with many fields.

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  vendor VARCHAR(255),
  version VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_name ON applications(name);

-- One data definition per global object + application pair
CREATE TABLE data_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_object_id UUID NOT NULL REFERENCES global_objects(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(global_object_id, application_id)
);

CREATE INDEX idx_data_definitions_object ON data_definitions(global_object_id);
CREATE INDEX idx_data_definitions_app ON data_definitions(application_id);

-- Fields within a data definition
CREATE TABLE data_definition_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_definition_id UUID NOT NULL REFERENCES data_definitions(id) ON DELETE CASCADE,
  table_name VARCHAR(255),
  field_name VARCHAR(255) NOT NULL,
  field_label VARCHAR(255),
  data_type VARCHAR(100),
  length INT,
  decimals INT,
  is_key BOOLEAN NOT NULL DEFAULT FALSE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ddf_definition ON data_definition_fields(data_definition_id);
CREATE INDEX idx_ddf_sort ON data_definition_fields(data_definition_id, sort_order);
