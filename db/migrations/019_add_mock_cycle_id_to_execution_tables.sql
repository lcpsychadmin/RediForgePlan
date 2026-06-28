-- Migration 019: scope execution data (project_objects, task_groups, tasks,
-- schedule_items) directly to mock cycles.
--
-- Before this migration all execution data was scoped only by project_id, which
-- meant every mock cycle that shared a project saw the same objects and tasks.
-- Adding mock_cycle_id lets each cycle have its own independent execution plan
-- while preserving the existing Project → Mock Cycles grouping hierarchy.
--
-- project_id remains NOT NULL on all four tables.  When creating cycle-scoped
-- rows the application will look up mock_cycles.project_id and fill both
-- columns.  The ON DELETE CASCADE on mock_cycle_id ensures that removing a
-- cycle (or its parent project) cleans up its execution data automatically.

BEGIN;

ALTER TABLE project_objects
  ADD COLUMN IF NOT EXISTS mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE CASCADE;

ALTER TABLE task_groups
  ADD COLUMN IF NOT EXISTS mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE CASCADE;

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS mock_cycle_id UUID REFERENCES mock_cycles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_objects_mock_cycle_id ON project_objects(mock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_mock_cycle_id     ON task_groups(mock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mock_cycle_id           ON tasks(mock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_mock_cycle_id  ON schedule_items(mock_cycle_id);

COMMIT;
