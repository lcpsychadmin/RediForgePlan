-- Migration 035: Project-level Data Migration Strategy storage, approvals, and document uploads

CREATE TABLE IF NOT EXISTS project_data_migration_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_approved_at TIMESTAMP,
  project_manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  project_manager_approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pdms_project_id ON project_data_migration_strategies(project_id);

CREATE TABLE IF NOT EXISTS project_strategy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE SET NULL,
  document_type VARCHAR(120) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_content BYTEA NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_psd_project_id ON project_strategy_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_psd_mock_cycle_id ON project_strategy_documents(mock_cycle_id);
