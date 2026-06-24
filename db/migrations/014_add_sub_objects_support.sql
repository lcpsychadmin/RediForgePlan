BEGIN;

ALTER TABLE project_objects
  ADD COLUMN IF NOT EXISTS parent_project_object_id UUID REFERENCES project_objects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sub_object_suffix VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sub_object_description TEXT;

CREATE INDEX IF NOT EXISTS idx_project_objects_parent_project_object_id
  ON project_objects(parent_project_object_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_objects_sub_object_unique
  ON project_objects(project_id, parent_project_object_id, sub_object_suffix)
  WHERE parent_project_object_id IS NOT NULL;

COMMIT;
