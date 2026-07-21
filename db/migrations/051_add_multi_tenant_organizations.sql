BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  domain VARCHAR(255) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('active', 'suspended', 'disabled'))
);

INSERT INTO organizations (name, slug, domain, status)
VALUES ('Default Organization', 'default', NULL, 'active')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  default_tenant_id UUID;
  t_name TEXT;
  fk_name TEXT;
BEGIN
  SELECT id INTO default_tenant_id
  FROM organizations
  WHERE slug = 'default'
  LIMIT 1;

  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Default organization not found';
  END IF;

  FOREACH t_name IN ARRAY ARRAY[
    'users',
    'sessions',
    'programs',
    'projects',
    'mock_cycles',
    'global_objects',
    'project_objects',
    'object_sub_objects',
    'applications',
    'data_definitions',
    'data_definition_sub_objects',
    'data_definition_fields',
    'application_tables',
    'application_fields',
    'cdm_fields',
    'field_mappings',
    'common_data_model',
    'canonical_attributes',
    'tasks',
    'task_groups',
    'schedule_items',
    'audit_logs',
    'people',
    'people_roles',
    'project_workflow_role_assignments',
    'project_process_area_role_assignments'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = t_name
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID', t_name);
      EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', t_name) USING default_tenant_id;
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t_name);

      fk_name := format('%s_tenant_id_fkey', t_name);
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = fk_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE RESTRICT',
          t_name,
          fk_name
        );
      END IF;

      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', format('%s_tenant_id_idx', t_name), t_name);
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_unique_idx ON users (tenant_id, lower(email));
CREATE INDEX IF NOT EXISTS users_email_lookup_idx ON users (lower(email));

COMMIT;