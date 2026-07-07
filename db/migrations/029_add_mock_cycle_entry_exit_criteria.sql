ALTER TABLE mock_cycles
  ADD COLUMN IF NOT EXISTS entry_criteria TEXT,
  ADD COLUMN IF NOT EXISTS exit_criteria TEXT;
