BEGIN;

ALTER TABLE projects ADD COLUMN program_id UUID;

UPDATE projects p
SET program_id = mc.program_id
FROM mock_cycles mc
WHERE p.mock_cycle_id = mc.id
  AND p.program_id IS NULL;

ALTER TABLE projects
  ALTER COLUMN program_id SET NOT NULL,
  ADD CONSTRAINT projects_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);

ALTER TABLE mock_cycles ADD COLUMN project_id UUID;

UPDATE mock_cycles mc
SET project_id = p.id
FROM projects p
WHERE p.mock_cycle_id = mc.id
  AND mc.project_id IS NULL;

-- Safety backfill: create a placeholder project for any cycle that still has no project.
INSERT INTO projects (
  mock_cycle_id,
  program_id,
  name,
  description,
  start_date,
  end_date,
  accent_color,
  progress_percentage
)
SELECT
  mc.id,
  mc.program_id,
  mc.name || ' Project',
  'Auto-created during hierarchy migration to preserve orphan mock cycle.',
  mc.start_date,
  mc.end_date,
  mc.accent_color,
  0
FROM mock_cycles mc
LEFT JOIN projects p ON p.mock_cycle_id = mc.id
WHERE mc.project_id IS NULL
  AND p.id IS NULL;

UPDATE mock_cycles mc
SET project_id = p.id
FROM projects p
WHERE p.mock_cycle_id = mc.id
  AND mc.project_id IS NULL;

ALTER TABLE mock_cycles
  ALTER COLUMN project_id SET NOT NULL,
  ADD CONSTRAINT mock_cycles_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mock_cycles_project_id ON mock_cycles(project_id);

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_mock_cycle_id_unique;
DROP INDEX IF EXISTS idx_projects_mock_cycle_id;
ALTER TABLE projects DROP COLUMN mock_cycle_id;

DROP INDEX IF EXISTS idx_mock_cycles_program_id;
ALTER TABLE mock_cycles DROP COLUMN program_id;

COMMIT;
