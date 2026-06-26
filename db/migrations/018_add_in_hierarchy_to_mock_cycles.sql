-- Migration 018: add in_hierarchy flag to mock_cycles
-- Allows mock cycles to be removed from the hierarchy tree without deleting the record.

ALTER TABLE mock_cycles
  ADD COLUMN in_hierarchy BOOLEAN NOT NULL DEFAULT TRUE;
