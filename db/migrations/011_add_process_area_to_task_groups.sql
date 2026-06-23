ALTER TABLE task_groups
ADD COLUMN IF NOT EXISTS process_area VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_task_groups_process_area ON task_groups(process_area);