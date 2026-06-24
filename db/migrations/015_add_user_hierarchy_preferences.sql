BEGIN;

CREATE TABLE IF NOT EXISTS user_hierarchy_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tree_order JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_preferences_updated_at
  ON user_hierarchy_preferences(updated_at);

COMMIT;
