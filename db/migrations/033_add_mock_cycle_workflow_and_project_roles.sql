ALTER TABLE mock_cycles
  ADD COLUMN IF NOT EXISTS entry_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exit_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_success_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
  ADD COLUMN IF NOT EXISTS target_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
  ADD COLUMN IF NOT EXISTS total_records_scope INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invalid_records INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_attempted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS load_errors INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_loaded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS load_success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS load_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS project_manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_manager_approved_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS project_workflow_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_key VARCHAR(64) NOT NULL CHECK (role_key IN ('lead', 'project_manager')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_workflow_role_assignments_unique UNIQUE (project_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_pwra_project_id ON project_workflow_role_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pwra_user_id ON project_workflow_role_assignments(user_id);

UPDATE mock_cycles
SET load_success_rate = CASE
  WHEN records_attempted > 0 THEN ROUND((records_loaded::NUMERIC / records_attempted::NUMERIC) * 100, 2)
  ELSE 0
END,
load_coverage_rate = CASE
  WHEN total_records_scope > 0 THEN ROUND((records_loaded::NUMERIC / total_records_scope::NUMERIC) * 100, 2)
  ELSE 0
END;
