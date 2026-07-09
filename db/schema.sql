-- RediForge Complete Database Schema
-- Authentication + Planning Application
-- UUID-based, fully normalized schema with proper constraints, indexes, and views

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');

CREATE TYPE task_type_enum AS ENUM (
  'extract',
  'transform',
  'preload_validation',
  'load',
  'postload_validation',
  'custom'
);

CREATE TYPE task_status_enum AS ENUM (
  'not_started',
  'in_progress',
  'blocked',
  'complete'
);

-- =====================================================
-- AUTHENTICATION TABLES
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(jwt_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE global_hierarchy_preferences (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tree_order JSONB,
  hierarchy_state JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_global_hierarchy_preferences_updated_at ON global_hierarchy_preferences(updated_at);

CREATE TABLE project_process_area_role_assignments (
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

CREATE INDEX idx_ppara_project_id ON project_process_area_role_assignments(project_id);
CREATE INDEX idx_ppara_project_process_area ON project_process_area_role_assignments(project_id, process_area);
CREATE INDEX idx_ppara_user_id ON project_process_area_role_assignments(user_id);

-- =====================================================
-- CORE HIERARCHY TABLES
-- =====================================================

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  accent_color VARCHAR(7),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  accent_color VARCHAR(7),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

CREATE INDEX idx_projects_program_id ON projects(program_id);

CREATE TABLE mock_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  entry_criteria TEXT,
  exit_criteria TEXT,
  entry_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  exit_criteria_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_success_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
  target_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 95,
  total_records_scope INTEGER NOT NULL DEFAULT 0,
  invalid_records INTEGER NOT NULL DEFAULT 0,
  records_attempted INTEGER NOT NULL DEFAULT 0,
  load_errors INTEGER NOT NULL DEFAULT 0,
  records_loaded INTEGER NOT NULL DEFAULT 0,
  load_success_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  load_coverage_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  lead_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_approved_at TIMESTAMP,
  project_manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  project_manager_approved_at TIMESTAMP,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  accent_color VARCHAR(7),
  schedule_mode VARCHAR(20) NOT NULL DEFAULT 'all_days' CHECK (schedule_mode IN ('all_days', 'working_days')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

CREATE INDEX idx_mock_cycles_project_id ON mock_cycles(project_id);

CREATE TABLE project_workflow_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_key VARCHAR(64) NOT NULL CHECK (role_key IN ('lead', 'project_manager')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_workflow_role_assignments_unique
    UNIQUE (project_id, role_key)
);

CREATE INDEX idx_pwra_project_id ON project_workflow_role_assignments(project_id);
CREATE INDEX idx_pwra_user_id ON project_workflow_role_assignments(user_id);

-- =====================================================
-- GLOBAL OBJECT INVENTORY (Canonical)
-- =====================================================

CREATE TABLE global_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  process_area VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_global_objects_object_id ON global_objects(object_id);
CREATE INDEX idx_global_objects_process_area ON global_objects(process_area);

-- =====================================================
-- PROJECT-BASED OBJECT INVENTORY (Execution Layer)
-- =====================================================

CREATE TABLE project_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  global_object_id UUID NOT NULL REFERENCES global_objects(id) ON DELETE RESTRICT,
  target_application_id UUID,
  source_application_id UUID,
  parent_project_object_id UUID REFERENCES project_objects(id) ON DELETE CASCADE,
  sub_object_suffix VARCHAR(50),
  sub_object_description TEXT,
  complexity VARCHAR(50),
  deployment_disposition VARCHAR(255),
  build_type VARCHAR(255),
  object_type VARCHAR(255),
  cutover_phase VARCHAR(255),
  ddm_approach VARCHAR(255),
  risk_security_type VARCHAR(255),
  migration_type VARCHAR(255),
  factor_type VARCHAR(255),
  load_method VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50),
  dra_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  developer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX idx_project_objects_project_id ON project_objects(project_id);
CREATE INDEX idx_project_objects_global_object_id ON project_objects(global_object_id);
CREATE INDEX idx_project_objects_composite ON project_objects(project_id, global_object_id);
CREATE INDEX idx_project_objects_dra_user_id ON project_objects(dra_user_id);
CREATE INDEX idx_project_objects_developer_user_id ON project_objects(developer_user_id);
CREATE INDEX idx_project_objects_parent_project_object_id ON project_objects(parent_project_object_id);
CREATE UNIQUE INDEX idx_project_objects_sub_object_unique ON project_objects(project_id, parent_project_object_id, sub_object_suffix) WHERE parent_project_object_id IS NOT NULL;

-- =====================================================
-- DEPENDENCIES
-- =====================================================

CREATE TABLE object_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_object_id UUID NOT NULL REFERENCES project_objects(id) ON DELETE CASCADE,
  depends_on_project_object_id UUID NOT NULL REFERENCES project_objects(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_object_id, depends_on_project_object_id),
  CONSTRAINT no_self_dependency CHECK (project_object_id != depends_on_project_object_id)
);

CREATE INDEX idx_object_dependencies_project_object_id ON object_dependencies(project_object_id);
CREATE INDEX idx_object_dependencies_depends_on ON object_dependencies(depends_on_project_object_id);

-- =====================================================
-- TASK GROUPS
-- =====================================================

CREATE TABLE task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  process_area VARCHAR(255),
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX idx_task_groups_project_id ON task_groups(project_id);
CREATE INDEX idx_task_groups_process_area ON task_groups(process_area);

-- =====================================================
-- TASKS
-- =====================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_object_id UUID REFERENCES project_objects(id) ON DELETE CASCADE,
  task_group_id UUID REFERENCES task_groups(id) ON DELETE CASCADE,
  task_type task_type_enum NOT NULL,
  name VARCHAR(255),
  status task_status_enum NOT NULL DEFAULT 'not_started',
  start_date DATE,
  end_date DATE,
  schedule_mode_override VARCHAR(20) CHECK (schedule_mode_override IN ('all_days', 'working_days')),
  dra_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  developer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
  CONSTRAINT at_least_one_parent CHECK (project_object_id IS NOT NULL OR task_group_id IS NOT NULL)
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_project_object_id ON tasks(project_object_id);
CREATE INDEX idx_tasks_task_group_id ON tasks(task_group_id);
CREATE INDEX idx_tasks_composite ON tasks(project_id, project_object_id, task_group_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_dra_user_id ON tasks(dra_user_id);
CREATE INDEX idx_tasks_developer_user_id ON tasks(developer_user_id);

-- =====================================================
-- SCHEDULE
-- =====================================================

CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, scheduled_date)
);

CREATE INDEX idx_schedule_items_project_id ON schedule_items(project_id);
CREATE INDEX idx_schedule_items_task_id ON schedule_items(task_id);
CREATE INDEX idx_schedule_items_scheduled_date ON schedule_items(scheduled_date);

-- =====================================================
-- AUDIT LOGGING
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- VIEWS
-- =====================================================

CREATE VIEW prioritized_tasks_view AS
SELECT
  t.id as task_id,
  t.project_id,
  t.project_object_id,
  t.task_group_id,
  t.status,
  t.start_date,
  t.end_date,
  CASE
    WHEN t.end_date < CURRENT_DATE AND t.status != 'complete' THEN 'late'
    WHEN t.status = 'in_progress' THEN 'in_progress'
    WHEN t.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'due_this_week'
    ELSE 'on_track'
  END as priority_category
FROM tasks t
WHERE t.project_id IS NOT NULL;

CREATE VIEW project_status_view AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p.start_date,
  p.end_date,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END) as blocked_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'not_started' THEN t.id END) as not_started_tasks,
  ROUND(
    COUNT(DISTINCT CASE WHEN t.status = 'complete' THEN t.id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT t.id), 0) * 100, 2
  ) as completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.start_date, p.end_date;

