-- Migration 006: People roles
CREATE TABLE IF NOT EXISTS people_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO people_roles (name, sort_order) VALUES
  ('DRA Analyst', 1),
  ('Developer', 2),
  ('Solution Delivery', 3),
  ('Business', 4)
ON CONFLICT (name) DO NOTHING;
