CREATE TABLE IF NOT EXISTS ai_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_gateway_id UUID REFERENCES ai_gateways(id) ON DELETE SET NULL,
  default_router_id UUID REFERENCES ai_routers(id) ON DELETE SET NULL,
  routing_strategy VARCHAR(100) NOT NULL DEFAULT 'balanced',
  cost_ceiling NUMERIC(12, 4),
  provider_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_logic TEXT,
  ai_overrides_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
