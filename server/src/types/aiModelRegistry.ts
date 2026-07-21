export type SupportedProvider = 'openai' | 'anthropic' | 'databricks';

export interface ModelConfig {
  id: string;
  modelKey: string;
  displayName: string;
  provider: SupportedProvider;
  modelFamily: string | null;
  contextWindow: number | null;
  endpointUrl: string | null;
  maxTokens: number | null;
  latencyClass: string | null;
  inputCostPer1kTokens: number | null;
  outputCostPer1kTokens: number | null;
  isActive: boolean;
  capabilities: string[];
}

export interface ModelSelectionPreferences {
  modelName?: string;
  capability?: string | string[];
  costTier?: string | string[];
  provider?: string;
  allowFallback?: boolean;
}

export interface ResolvedModelSelection {
  model: ModelConfig;
  reason: string;
  fallbackApplied: boolean;
}
