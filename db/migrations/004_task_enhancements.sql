-- Migration 004: Task enhancements
-- Add assigned_to, duration, duration_unit to tasks
-- Add task_dependencies table
-- Add default_task_templates table

-- Add new columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
  ADD COLUMN IF NOT EXISTS duration NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(10) DEFAULT 'hours';

-- Task-level dependencies (any task in the same mock cycle)
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, depends_on_task_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Default task templates (maintained in settings)
CREATE TABLE IF NOT EXISTS default_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  task_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration NUMERIC(8,2) DEFAULT 8,
  duration_unit VARCHAR(10) DEFAULT 'hours',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default tasks
INSERT INTO default_task_templates (name, task_type, sort_order, duration, duration_unit) VALUES
  ('Extract', 'extract', 1, 8, 'hours'),
  ('Extract Validation', 'custom', 2, 4, 'hours'),
  ('Transformation', 'transform', 3, 8, 'hours'),
  ('PreLoad Validation', 'preload_validation', 4, 4, 'hours'),
  ('Load', 'load', 5, 8, 'hours'),
  ('PostLoad Validation', 'postload_validation', 6, 4, 'hours')
ON CONFLICT DO NOTHING;
