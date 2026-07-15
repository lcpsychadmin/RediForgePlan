-- =====================================================
-- AI PLATFORM + OBJECT ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  provider VARCHAR(255),
  model_family VARCHAR(255),
  context_window INTEGER,
  input_cost_per_1k_tokens NUMERIC(12, 6),
  output_cost_per_1k_tokens NUMERIC(12, 6),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_models_model_key ON ai_models(model_key);
CREATE INDEX IF NOT EXISTS idx_ai_models_display_name ON ai_models(display_name);

CREATE TABLE IF NOT EXISTS ai_model_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  capability_key VARCHAR(255) NOT NULL,
  description TEXT,
  is_supported BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (model_id, capability_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_capabilities_model_id ON ai_model_capabilities(model_id);

CREATE TABLE IF NOT EXISTS ai_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  endpoint_url TEXT,
  auth_type VARCHAR(100),
  default_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  failover_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_gateways_default_model_id ON ai_gateways(default_model_id);

CREATE TABLE IF NOT EXISTS ai_routers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  strategy VARCHAR(100),
  primary_gateway_id UUID REFERENCES ai_gateways(id) ON DELETE SET NULL,
  fallback_gateway_id UUID REFERENCES ai_gateways(id) ON DELETE SET NULL,
  allowed_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_routers_primary_gateway_id ON ai_routers(primary_gateway_id);

CREATE TABLE IF NOT EXISTS ai_usage_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  max_requests_per_minute INTEGER,
  max_tokens_per_request INTEGER,
  allowed_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_router_id UUID REFERENCES ai_routers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_policies_default_router_id ON ai_usage_policies(default_router_id);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  gateway_id UUID REFERENCES ai_gateways(id) ON DELETE SET NULL,
  router_id UUID REFERENCES ai_routers(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES ai_usage_policies(id) ON DELETE SET NULL,
  request_tokens INTEGER,
  response_tokens INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model_id ON ai_usage_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_gateway_id ON ai_usage_logs(gateway_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_router_id ON ai_usage_logs(router_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_policy_id ON ai_usage_logs(policy_id);

ALTER TABLE global_objects
  ADD COLUMN IF NOT EXISTS default_gateway_id UUID,
  ADD COLUMN IF NOT EXISTS default_router_id UUID;

ALTER TABLE project_objects
  ADD COLUMN IF NOT EXISTS gateway_override_id UUID,
  ADD COLUMN IF NOT EXISTS router_override_id UUID;

ALTER TABLE global_objects
  ADD CONSTRAINT fk_global_objects_default_gateway_id
    FOREIGN KEY (default_gateway_id) REFERENCES ai_gateways(id) ON DELETE SET NULL;

ALTER TABLE global_objects
  ADD CONSTRAINT fk_global_objects_default_router_id
    FOREIGN KEY (default_router_id) REFERENCES ai_routers(id) ON DELETE SET NULL;

ALTER TABLE project_objects
  ADD CONSTRAINT fk_project_objects_gateway_override_id
    FOREIGN KEY (gateway_override_id) REFERENCES ai_gateways(id) ON DELETE SET NULL;

ALTER TABLE project_objects
  ADD CONSTRAINT fk_project_objects_router_override_id
    FOREIGN KEY (router_override_id) REFERENCES ai_routers(id) ON DELETE SET NULL;