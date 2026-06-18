-- Migration 008: accent colors for hierarchy levels
-- Add optional accent colors for programs and mock cycles

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);

ALTER TABLE mock_cycles
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
