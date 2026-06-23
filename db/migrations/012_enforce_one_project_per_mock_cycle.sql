-- Enforce one project per mock cycle.
-- Safety rule: abort if a cycle has multiple non-empty projects (to avoid data loss).

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    WITH project_activity AS (
      SELECT
        p.id,
        p.mock_cycle_id,
        (
          (SELECT COUNT(*) FROM project_objects po WHERE po.project_id = p.id) +
          (SELECT COUNT(*) FROM task_groups tg WHERE tg.project_id = p.id) +
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)
        )::INT AS activity_score
      FROM projects p
    )
    SELECT 1
    FROM project_activity
    GROUP BY mock_cycle_id
    HAVING COUNT(*) FILTER (WHERE activity_score > 0) > 1
  ) THEN
    RAISE EXCEPTION 'Migration halted: one or more mock cycles have multiple non-empty projects. Resolve manually before applying unique project-per-cycle constraint.';
  END IF;
END $$;

WITH project_activity AS (
  SELECT
    p.id,
    p.mock_cycle_id,
    p.updated_at,
    p.created_at,
    (
      (SELECT COUNT(*) FROM project_objects po WHERE po.project_id = p.id) +
      (SELECT COUNT(*) FROM task_groups tg WHERE tg.project_id = p.id) +
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)
    )::INT AS activity_score
  FROM projects p
),
ranked AS (
  SELECT
    id,
    mock_cycle_id,
    ROW_NUMBER() OVER (
      PARTITION BY mock_cycle_id
      ORDER BY activity_score DESC, updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM project_activity
),
losers AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM projects p
USING losers l
WHERE p.id = l.id;

ALTER TABLE projects
  ADD CONSTRAINT projects_mock_cycle_id_unique UNIQUE (mock_cycle_id);

COMMIT;
