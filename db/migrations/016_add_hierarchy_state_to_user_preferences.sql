BEGIN;

ALTER TABLE user_hierarchy_preferences
  ADD COLUMN IF NOT EXISTS hierarchy_state JSONB;

COMMIT;
