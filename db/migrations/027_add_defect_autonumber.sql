-- Migration 027: add human-friendly defect auto-number

CREATE SEQUENCE IF NOT EXISTS defects_defect_number_seq;

ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS defect_number BIGINT;

ALTER TABLE defects
  ALTER COLUMN defect_number SET DEFAULT nextval('defects_defect_number_seq');

UPDATE defects
SET defect_number = nextval('defects_defect_number_seq')
WHERE defect_number IS NULL;

SELECT setval(
  'defects_defect_number_seq',
  COALESCE((SELECT MAX(defect_number) FROM defects), 1),
  COALESCE((SELECT MAX(defect_number) FROM defects), 0) > 0
);

ALTER TABLE defects
  ALTER COLUMN defect_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_defects_defect_number
  ON defects(defect_number);
