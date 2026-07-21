BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sso_config JSONB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_role VARCHAR(30),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);

ALTER TABLE users
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE sessions
  ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_super_admin_check;
ALTER TABLE users
  ADD CONSTRAINT users_tenant_super_admin_check
  CHECK (NOT (is_super_admin = true AND tenant_id IS NOT NULL));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_role_valid_check;
ALTER TABLE users
  ADD CONSTRAINT users_tenant_role_valid_check
  CHECK (tenant_role IS NULL OR tenant_role IN ('tenant_admin', 'member', 'viewer'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_role_scope_check;
ALTER TABLE users
  ADD CONSTRAINT users_tenant_role_scope_check
  CHECK (
    (tenant_id IS NULL AND tenant_role IS NULL)
    OR
    (tenant_id IS NOT NULL AND tenant_role IS NOT NULL)
  );

DROP INDEX IF EXISTS users_tenant_email_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_global_unique_idx ON users (lower(email));

COMMIT;