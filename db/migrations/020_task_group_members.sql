-- Migration 020: Add members JSONB column to task_groups
-- Stores an ordered array of project_object_ids that have been
-- manually added to a plan group (no auto-tasks on add).

ALTER TABLE task_groups
  ADD COLUMN IF NOT EXISTS members JSONB NOT NULL DEFAULT '[]'::jsonb;
