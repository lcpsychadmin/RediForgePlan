-- Seed: Initial test data
-- Description: Populates the database with sample data for development

BEGIN;

-- Insert sample users (passwords should be hashed in production)
-- This is just for development testing
INSERT INTO users (email, first_name, last_name, password_hash)
VALUES 
  ('user1@example.com', 'John', 'Doe', 'hashed_password_1'),
  ('user2@example.com', 'Jane', 'Smith', 'hashed_password_2')
ON CONFLICT (email) DO NOTHING;

COMMIT;
