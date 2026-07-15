export interface AiModelCapability {
  id: string;
  modelId: string;
  capabilityKey: string;
  description?: string | null;
  isSupported: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiModel {
  id: string;
  modelKey: string;
  displayName: string;
  provider?: string | null;
  modelFamily?: string | null;
  contextWindow?: number | null;
  inputCostPer1kTokens?: number | null;
  outputCostPer1kTokens?: number | null;
  isActive: boolean;
  capabilities?: AiModelCapability[];
}

export interface AiGateway {
  id: string;
  name: string;
  description?: string | null;
  endpointUrl?: string | null;
  authType?: string | null;
  defaultModelId?: string | null;
  defaultModelName?: string | null;
  failoverModelId?: string | null;
  failoverModelName?: string | null;
  isActive: boolean;
}

export interface AiRouter {
  id: string;
  name: string;
  description?: string | null;
  strategy?: string | null;
  primaryGatewayId?: string | null;
  primaryGatewayName?: string | null;
  fallbackGatewayId?: string | null;
  fallbackGatewayName?: string | null;
  allowedModelIds?: string[];
  isActive: boolean;
}

export interface AiUsagePolicy {
  id: string;
  name: string;
  description?: string | null;
  maxRequestsPerMinute?: number | null;
  maxTokensPerRequest?: number | null;
  allowedCapabilities?: string[];
  blockedModelIds?: string[];
  defaultRouterId?: string | null;
  defaultRouterName?: string | null;
  isActive: boolean;
}

export type AiSettingsSection = 'models' | 'gateways' | 'routers' | 'policies';