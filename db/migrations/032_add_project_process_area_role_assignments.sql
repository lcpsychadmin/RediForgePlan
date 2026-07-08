CREATE TABLE IF NOT EXISTS project_process_area_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  process_area VARCHAR(255) NOT NULL,
  role_key VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_process_area_role_assignments_unique
    UNIQUE (project_id, process_area, role_key)
);

CREATE INDEX IF NOT EXISTS idx_ppara_project_id
  ON project_process_area_role_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_ppara_project_process_area
  ON project_process_area_role_assignments(project_id, process_area);

CREATE INDEX IF NOT EXISTS idx_ppara_user_id
  ON project_process_area_role_assignments(user_id);
