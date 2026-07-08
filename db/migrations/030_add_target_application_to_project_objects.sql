ALTER TABLE project_objects
  ADD COLUMN IF NOT EXISTS target_application_id UUID;

CREATE INDEX IF NOT EXISTS idx_project_objects_target_application_id
  ON project_objects(target_application_id);
