ALTER TABLE project_objects
  ADD COLUMN IF NOT EXISTS source_application_id UUID;

CREATE INDEX IF NOT EXISTS idx_project_objects_source_application_id
  ON project_objects(source_application_id);
