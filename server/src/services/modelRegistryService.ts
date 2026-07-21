import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  ModelConfig,
  ModelSelectionPreferences,
  ResolvedModelSelection,
  SupportedProvider,
} from '../types/aiModelRegistry.js';

const toLower = (value: unknown) => String(value || '').trim().toLowerCase();

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const isSupportedProvider = (provider: string): provider is SupportedProvider => {
  const normalized = toLower(provider);
  return normalized === 'openai' || normalized === 'anthropic' || normalized === 'databricks';
};

const normalizeModelConfig = (row: any): ModelConfig | null => {
  const provider = toLower(row?.provider);
  if (!isSupportedProvider(provider)) {
    return null;
  }

  return {
    id: String(row.id),
    modelKey: String(row.model_key || ''),
    displayName: String(row.display_name || row.model_key || ''),
    provider,
    modelFamily: row.model_family ?? null,
    contextWindow: row.context_window == null ? null : Number(row.context_window),
    endpointUrl: row.endpoint_url ?? null,
    maxTokens: row.max_tokens == null ? null : Number(row.max_tokens),
    latencyClass: row.latency_class ?? null,
    inputCostPer1kTokens: row.input_cost_per_1k_tokens == null ? null : Number(row.input_cost_per_1k_tokens),
    outputCostPer1kTokens: row.output_cost_per_1k_tokens == null ? null : Number(row.output_cost_per_1k_tokens),
    isActive: !!row.is_active,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map((entry: any) => String(entry)).filter(Boolean) : [],
  };
};

class ModelRegistryService {
  private async fetchActiveModels(): Promise<ModelConfig[]> {
    const result = await db.query(
      `SELECT
         m.id,
         m.model_key,
         m.display_name,
         m.provider,
         m.model_family,
         m.context_window,
         m.endpoint_url,
         m.max_tokens,
         m.latency_class,
         m.input_cost_per_1k_tokens,
         m.output_cost_per_1k_tokens,
         m.is_active,
         COALESCE(
           json_agg(c.capability_key ORDER BY c.capability_key)
             FILTER (WHERE c.id IS NOT NULL AND c.is_supported = TRUE),
           '[]'::json
         ) AS capabilities
       FROM ai_models m
       LEFT JOIN ai_model_capabilities c ON c.model_id = m.id
       WHERE m.is_active = TRUE
       GROUP BY m.id
       ORDER BY m.display_name ASC`
    );

    return result.rows
      .map((row: any) => normalizeModelConfig(row))
      .filter((row: ModelConfig | null): row is ModelConfig => Boolean(row));
  }

  async listAvailableModels(): Promise<ModelConfig[]> {
    return this.fetchActiveModels();
  }

  private rankByCost(models: ModelConfig[]): ModelConfig[] {
    return [...models].sort((a, b) => {
      const aCost = (a.inputCostPer1kTokens || 0) + (a.outputCostPer1kTokens || 0);
      const bCost = (b.inputCostPer1kTokens || 0) + (b.outputCostPer1kTokens || 0);
      return aCost - bCost;
    });
  }

  private filterByModelName(models: ModelConfig[], modelName: string): ModelConfig[] {
    const normalized = toLower(modelName);
    if (!normalized) {
      return models;
    }

    return models.filter((model) => {
      const modelKey = toLower(model.modelKey);
      const displayName = toLower(model.displayName);
      return modelKey === normalized || displayName === normalized || modelKey.includes(normalized) || displayName.includes(normalized);
    });
  }

  private filterByProvider(models: ModelConfig[], provider?: string): ModelConfig[] {
    const normalized = toLower(provider);
    if (!normalized) {
      return models;
    }
    return models.filter((model) => toLower(model.provider) === normalized);
  }

  private filterByCapabilities(models: ModelConfig[], capabilities: string[]): ModelConfig[] {
    if (!capabilities.length) {
      return models;
    }

    const wanted = capabilities.map((entry) => toLower(entry));
    return models.filter((model) => {
      const available = new Set(model.capabilities.map((entry) => toLower(entry)));
      return wanted.every((capability) => available.has(capability));
    });
  }

  private filterByCostTier(models: ModelConfig[], tiers: string[]): ModelConfig[] {
    if (!tiers.length) {
      return models;
    }

    const wanted = tiers.map((entry) => toLower(entry));
    return models.filter((model) => {
      const family = toLower(model.modelFamily);
      const latency = toLower(model.latencyClass);
      return wanted.includes(family) || wanted.includes(latency);
    });
  }

  async resolveModel(preferences: ModelSelectionPreferences = {}): Promise<ResolvedModelSelection> {
    const allActiveModels = await this.fetchActiveModels();
    if (!allActiveModels.length) {
      throw new ApiError(404, 'No active AI models are registered', 'NO_ACTIVE_MODELS');
    }

    const capabilities = toStringList(preferences.capability);
    const costTiers = toStringList(preferences.costTier);
    const allowFallback = preferences.allowFallback !== false;

    const stages: Array<{ reason: string; items: ModelConfig[] }> = [];

    const byProvider = this.filterByProvider(allActiveModels, preferences.provider);
    stages.push({ reason: 'provider-filter', items: byProvider });

    const byName = this.filterByModelName(byProvider, preferences.modelName || '');
    stages.push({ reason: 'model-name-filter', items: byName });

    const byNameCapability = this.filterByCapabilities(byName, capabilities);
    stages.push({ reason: 'model+capability-filter', items: byNameCapability });

    const strict = this.filterByCostTier(byNameCapability, costTiers);
    stages.push({ reason: 'strict-selection', items: strict });

    const fallbackByCapability = this.filterByCapabilities(byProvider, capabilities);
    stages.push({ reason: 'fallback-capability', items: fallbackByCapability });

    const fallbackByTier = this.filterByCostTier(byProvider, costTiers);
    stages.push({ reason: 'fallback-cost-tier', items: fallbackByTier });

    stages.push({ reason: 'fallback-provider-only', items: byProvider });
    stages.push({ reason: 'fallback-any-active', items: allActiveModels });

    for (const stage of stages) {
      if (!stage.items.length) {
        continue;
      }

      const ranked = this.rankByCost(stage.items);
      const selected = ranked[0];
      const fallbackApplied = stage.reason !== 'strict-selection';

      if (fallbackApplied && !allowFallback) {
        continue;
      }

      return {
        model: selected,
        reason: stage.reason,
        fallbackApplied,
      };
    }

    throw new ApiError(
      404,
      'No registered AI model matched the requested preferences and fallback constraints',
      'MODEL_NOT_FOUND'
    );
  }
}

export default new ModelRegistryService();
