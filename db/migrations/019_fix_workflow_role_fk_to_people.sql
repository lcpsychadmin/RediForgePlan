-- Migration 019: Fix project_workflow_role_assignments FK to reference people instead of users
-- The table may not exist yet on all environments; handle both cases.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'project_workflow_role_assignments'
  ) THEN
    -- Drop old FK constraint referencing users(id)
    ALTER TABLE project_workflow_role_assignments
      DROP CONSTRAINT IF EXISTS project_workflow_role_assignments_user_id_fkey;

    -- Add correct FK referencing people(id)
    ALTER TABLE project_workflow_role_assignments
      ADD CONSTRAINT project_workflow_role_assignments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES people(id) ON DELETE CASCADE;
  END IF;
END;
$$;
