-- Migration 034: Enforce workflow role assignments to reference application users only

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'project_workflow_role_assignments'
  ) THEN
    -- Remove assignments pointing to non-user identities before FK enforcement.
    DELETE FROM project_workflow_role_assignments
    WHERE user_id NOT IN (SELECT id FROM users);

    ALTER TABLE project_workflow_role_assignments
      DROP CONSTRAINT IF EXISTS project_workflow_role_assignments_user_id_fkey;

    ALTER TABLE project_workflow_role_assignments
      ADD CONSTRAINT project_workflow_role_assignments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END;
$$;
