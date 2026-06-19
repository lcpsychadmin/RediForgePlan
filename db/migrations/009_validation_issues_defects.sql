-- Migration 009: validation stats, issue tracking, and defects

-- Validation stats per task
CREATE TABLE IF NOT EXISTS task_validation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  total_records INTEGER NOT NULL DEFAULT 0,
  valid_records INTEGER NOT NULL DEFAULT 0,
  invalid_records INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_validation_stats_non_negative CHECK (
    total_records >= 0 AND valid_records >= 0 AND invalid_records >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_validation_stats_task_id
  ON task_validation_stats(task_id);

-- Issue type breakdowns per task
CREATE TABLE IF NOT EXISTS task_issue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  issue_code VARCHAR(100) NOT NULL,
  issue_description TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_issue_types_count_non_negative CHECK (count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_task_issue_types_task_id
  ON task_issue_types(task_id);

-- Optional record-level issue tracking
CREATE TABLE IF NOT EXISTS task_issue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_issue_type_id UUID NOT NULL REFERENCES task_issue_types(id) ON DELETE CASCADE,
  record_identifier VARCHAR(255) NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_issue_records_issue_type_id
  ON task_issue_records(task_issue_type_id);

-- Defect enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_severity_enum') THEN
    CREATE TYPE defect_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'defect_status_enum') THEN
    CREATE TYPE defect_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
END$$;

-- Defects linked to tasks, issue types, and project objects
CREATE TABLE IF NOT EXISTS defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_object_id UUID REFERENCES project_objects(id) ON DELETE SET NULL,
  issue_type_id UUID REFERENCES task_issue_types(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity defect_severity_enum NOT NULL DEFAULT 'medium',
  status defect_status_enum NOT NULL DEFAULT 'open',
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_defects_task_id ON defects(task_id);
CREATE INDEX IF NOT EXISTS idx_defects_project_object_id ON defects(project_object_id);
CREATE INDEX IF NOT EXISTS idx_defects_issue_type_id ON defects(issue_type_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
