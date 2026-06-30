-- Migration 022: Add actual execution dates to tasks
-- Three date sets: plan (start_date/end_date), revised, actual.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE;
