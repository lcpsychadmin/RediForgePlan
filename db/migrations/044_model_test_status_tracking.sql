ALTER TABLE ai_models
  ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS last_test_timestamp TIMESTAMP;
