BEGIN;

CREATE TABLE IF NOT EXISTS global_hierarchy_preferences (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tree_order JSONB,
  hierarchy_state JSONB,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO global_hierarchy_preferences (id, tree_order, hierarchy_state, updated_at)
SELECT 1, tree_order, hierarchy_state, COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM user_hierarchy_preferences
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE
SET tree_order = EXCLUDED.tree_order,
    hierarchy_state = EXCLUDED.hierarchy_state,
    updated_at = EXCLUDED.updated_at;

INSERT INTO global_hierarchy_preferences (id, tree_order, hierarchy_state, updated_at)
SELECT 1, NULL::jsonb, NULL::jsonb, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM global_hierarchy_preferences WHERE id = 1
);

COMMIT;
