-- Migration 010: automation rules for automated defect creation

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_rule_type_enum') THEN
    CREATE TYPE automation_rule_type_enum AS ENUM ('validation', 'issue_type', 'task_status');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type automation_rule_type_enum NOT NULL,
  severity defect_severity_enum NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  auto_assign_to_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT automation_rules_threshold_non_negative CHECK (threshold >= 0)
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_type_enabled
  ON automation_rules(rule_type, enabled);

-- Seed defaults
-- Preload invalid_records >= 1 -> medium
INSERT INTO automation_rules (rule_type, severity, threshold, enabled)
SELECT 'validation', 'medium', 1, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM automation_rules
  WHERE rule_type = 'validation' AND severity = 'medium' AND threshold = 1
);

-- Postload error_records >= 1 -> high
INSERT INTO automation_rules (rule_type, severity, threshold, enabled)
SELECT 'validation', 'high', 1, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM automation_rules
  WHERE rule_type = 'validation' AND severity = 'high' AND threshold = 1
);

-- Issue type count >= 1 -> medium
INSERT INTO automation_rules (rule_type, severity, threshold, enabled)
SELECT 'issue_type', 'medium', 1, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM automation_rules
  WHERE rule_type = 'issue_type' AND severity = 'medium' AND threshold = 1
);

-- Task status blocked/failed -> high
INSERT INTO automation_rules (rule_type, severity, threshold, enabled)
SELECT 'task_status', 'high', 1, TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM automation_rules
  WHERE rule_type = 'task_status' AND severity = 'high' AND threshold = 1
);
