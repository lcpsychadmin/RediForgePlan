ALTER TABLE ai_models
  ADD COLUMN IF NOT EXISTS endpoint_url TEXT,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS latency_class VARCHAR(100);

ALTER TABLE ai_routers
  ADD COLUMN IF NOT EXISTS preferred_cost_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_latency_class VARCHAR(100),
  ADD COLUMN IF NOT EXISTS required_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
