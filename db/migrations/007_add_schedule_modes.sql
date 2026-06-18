-- Migration 007: calendar mode controls
-- Add cycle-level scheduling mode and task-level override

ALTER TABLE mock_cycles
  ADD COLUMN IF NOT EXISTS schedule_mode VARCHAR(20) NOT NULL DEFAULT 'all_days';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mock_cycles_schedule_mode_check'
  ) THEN
    ALTER TABLE mock_cycles
      ADD CONSTRAINT mock_cycles_schedule_mode_check
      CHECK (schedule_mode IN ('all_days', 'working_days'));
  END IF;
END $$;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS schedule_mode_override VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_schedule_mode_override_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_schedule_mode_override_check
      CHECK (schedule_mode_override IN ('all_days', 'working_days'));
  END IF;
END $$;
