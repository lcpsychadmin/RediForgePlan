-- Migration 021: Add revised plan dates to tasks
-- These allow capturing execution actuals while preserving the original plan dates.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS revised_start_date DATE,
  ADD COLUMN IF NOT EXISTS revised_end_date DATE;
