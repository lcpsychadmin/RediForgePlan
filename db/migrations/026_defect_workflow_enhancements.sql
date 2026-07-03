-- Migration 026: defect workflow enhancements

CREATE TABLE IF NOT EXISTS defect_root_cause_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE defects
  ADD COLUMN IF NOT EXISTS defect_details TEXT,
  ADD COLUMN IF NOT EXISTS root_cause_details TEXT,
  ADD COLUMN IF NOT EXISTS resolution_details TEXT,
  ADD COLUMN IF NOT EXISTS root_cause_category_id UUID REFERENCES defect_root_cause_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_resolution_date DATE;

CREATE INDEX IF NOT EXISTS idx_defects_root_cause_category_id ON defects(root_cause_category_id);
CREATE INDEX IF NOT EXISTS idx_defects_target_resolution_date ON defects(target_resolution_date);

CREATE TABLE IF NOT EXISTS defect_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data BYTEA NOT NULL,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_defect_attachments_defect_id ON defect_attachments(defect_id);