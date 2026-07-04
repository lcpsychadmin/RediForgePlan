ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;
