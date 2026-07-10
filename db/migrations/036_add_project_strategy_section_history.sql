-- Migration 036: Track per-section change history for project data migration strategy content

CREATE TABLE IF NOT EXISTS project_strategy_section_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_key VARCHAR(120) NOT NULL,
  previous_content TEXT NOT NULL DEFAULT '',
  next_content TEXT NOT NULL DEFAULT '',
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pssh_project_section ON project_strategy_section_history(project_id, section_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pssh_changed_by ON project_strategy_section_history(changed_by);