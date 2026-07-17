import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';

type AiExecutionContext = {
  modelId?: string;
  gatewayId?: string;
  routerId?: string;
  policyId?: string;
  capabilityKeys?: string[];
  requestTokens?: number;
  responseTokens?: number;
  payload?: Record<string, unknown>;
};

type AiSelectionResult = {
  model: any;
  gateway: any | null;
  router: any | null;
};

export type AiModelTestResult = {
  success: boolean;
  responseText: string;
  latencyMs: number;
  tokensUsed: number | null;
  modelUsed: string | null;
  modelEcho: string | null;
  errorMessage?: string;
};

type ModelWithCapabilities = {
  id: string;
  model_key: string;
  display_name: string;
  provider: string | null;
  model_family: string | null;
  context_window: number | null;
  endpoint_url: string | null;
  api_key: string | null;
  max_tokens: number | null;
  latency_class: string | null;
  input_cost_per_1k_tokens: number | null;
  output_cost_per_1k_tokens: number | null;
  is_active: boolean;
  capabilities: string[];
};

const parseIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry)).filter(Boolean);
};

const normalizeModelName = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const isModelEquivalent = (expected: string | null | undefined, actual: string | null | undefined) => {
  const expectedNorm = normalizeModelName(expected);
  const actualNorm = normalizeModelName(actual);
  if (!expectedNorm || !actualNorm) {
    return false;
  }
  if (expectedNorm === actualNorm) {
    return true;
  }
  return expectedNorm.startsWith(`${actualNorm}-`) || actualNorm.startsWith(`${expectedNorm}-`);
};

class AiExecutionService {
  private async loadModelById(modelId: string) {
    const result = await db.query(
      `SELECT m.id, m.model_key, m.display_name, m.provider, m.model_family, m.context_window,
              m.endpoint_url, m.api_key, m.max_tokens, m.latency_class,
              m.input_cost_per_1k_tokens, m.output_cost_per_1k_tokens, m.is_active,
              COALESCE(
                json_agg(c.capability_key ORDER BY c.capability_key) FILTER (WHERE c.id IS NOT NULL AND c.is_supported = TRUE),
                '[]'::json
              ) AS capabilities
       FROM ai_models m
       LEFT JOIN ai_model_capabilities c ON c.model_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [modelId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI model not found', 'NOT_FOUND');
    }

    return result.rows[0];
  }

  private async loadAllActiveModels() {
    const result = await db.query(
      `SELECT m.id, m.model_key, m.display_name, m.provider, m.model_family, m.context_window,
              m.endpoint_url, m.api_key, m.max_tokens, m.latency_class,
              m.input_cost_per_1k_tokens, m.output_cost_per_1k_tokens, m.is_active,
              COALESCE(
                json_agg(c.capability_key ORDER BY c.capability_key) FILTER (WHERE c.id IS NOT NULL AND c.is_supported = TRUE),
                '[]'::json
              ) AS capabilities
       FROM ai_models m
       LEFT JOIN ai_model_capabilities c ON c.model_id = m.id
       WHERE m.is_active = TRUE
       GROUP BY m.id
       ORDER BY m.display_name ASC`
    );

    return result.rows as ModelWithCapabilities[];
  }

  private async loadGatewayById(gatewayId: string) {
    const result = await db.query(
      `SELECT id, name, description, endpoint_url, auth_type, default_model_id, failover_model_id, is_active, created_at, updated_at
       FROM ai_gateways
       WHERE id = $1`,
      [gatewayId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI gateway not found', 'NOT_FOUND');
    }

    return result.rows[0];
  }

  private async loadRouterById(routerId: string) {
    const result = await db.query(
      `SELECT id, name, description, strategy, primary_gateway_id, fallback_gateway_id, allowed_model_ids,
              preferred_cost_tiers, preferred_latency_class, required_capabilities, fallback_model_ids,
              is_active, created_at, updated_at
       FROM ai_routers
       WHERE id = $1`,
      [routerId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI router not found', 'NOT_FOUND');
    }

    return result.rows[0];
  }

  private async loadPolicyById(policyId: string) {
    const result = await db.query(
      `SELECT id, name, description, max_requests_per_minute, max_tokens_per_request,
              allowed_capabilities, blocked_model_ids, default_router_id, is_active, created_at, updated_at
       FROM ai_usage_policies
       WHERE id = $1`,
      [policyId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI usage policy not found', 'NOT_FOUND');
    }

    return result.rows[0];
  }

  private parseOpenAiResponse(responseJson: any) {
    const responseText = responseJson?.choices?.[0]?.message?.content || '';
    const usage = responseJson?.usage || null;
    const tokensUsed = usage ? ((usage.total_tokens ?? (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)) as number) : null;
    const modelUsed = responseJson?.model ? String(responseJson.model) : null;
    return { responseText, tokensUsed, modelUsed };
  }

  private parseAnthropicResponse(responseJson: any) {
    const responseText = Array.isArray(responseJson?.content)
      ? responseJson.content.map((entry: any) => entry?.text || '').join('\n').trim()
      : '';
    const usage = responseJson?.usage || null;
    const tokensUsed = usage ? ((usage.input_tokens || 0) + (usage.output_tokens || 0)) : null;
    const modelUsed = responseJson?.model ? String(responseJson.model) : null;
    return { responseText, tokensUsed, modelUsed };
  }

  private parseDatabricksResponse(responseJson: any) {
    const responseText =
      responseJson?.choices?.[0]?.message?.content ||
      responseJson?.predictions?.[0] ||
      responseJson?.outputs?.[0] ||
      responseJson?.result ||
      '';
    const usage = responseJson?.usage || null;
    const tokensUsed = usage ? ((usage.total_tokens ?? (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)) as number) : null;
    const modelUsed = responseJson?.metadata?.model_name ? String(responseJson.metadata.model_name) : null;
    return { responseText: String(responseText || ''), tokensUsed, modelUsed };
  }

  private async requestWithBearer(endpoint: string, apiKey: string, body: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseJson: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        responseJson?.error?.message || responseJson?.message || response.statusText,
        'MODEL_TEST_REQUEST_FAILED'
      );
    }

    return responseJson;
  }

  async testModelConfiguration(modelId: string, prompt: string): Promise<AiModelTestResult> {
    const model = await this.loadModelById(modelId) as ModelWithCapabilities;
    const provider = String(model.provider || '').toLowerCase();
    const apiKey = model.api_key;

    if (!apiKey) {
      throw new ApiError(400, 'Model API key is missing', 'MODEL_TEST_KEY_MISSING');
    }

    const startedAt = Date.now();
    let responseText = '';
    let tokensUsed: number | null = null;
    let modelUsed: string | null = null;
    let modelEcho: string | null = null;
    const echoPrompt = 'Respond ONLY with the model name you are running on.';

    if (provider === 'openai') {
      const endpoint = model.endpoint_url || 'https://api.openai.com/v1/chat/completions';
      const responseJson = await this.requestWithBearer(endpoint, apiKey, {
        model: model.model_key,
        messages: [{ role: 'user', content: prompt }],
        ...(model.max_tokens ? { max_tokens: model.max_tokens } : {}),
      });
      const parsed = this.parseOpenAiResponse(responseJson);
      responseText = parsed.responseText;
      tokensUsed = parsed.tokensUsed;
      modelUsed = parsed.modelUsed;

      if (!isModelEquivalent(model.model_key, modelUsed)) {
        throw new ApiError(
          409,
          `Provider model mismatch. Expected ${model.model_key}, got ${modelUsed || 'unknown'}.`,
          'MODEL_PROVIDER_MISMATCH'
        );
      }

      const echoJson = await this.requestWithBearer(endpoint, apiKey, {
        model: model.model_key,
        messages: [{ role: 'user', content: echoPrompt }],
        ...(model.max_tokens ? { max_tokens: model.max_tokens } : {}),
      });
      modelEcho = this.parseOpenAiResponse(echoJson).responseText || null;
    } else if (provider === 'anthropic') {
      const endpoint = model.endpoint_url || 'https://api.anthropic.com/v1/messages';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.model_key,
          max_tokens: model.max_tokens || 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const responseJson: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseJson?.error?.message || responseJson?.message || response.statusText,
          'MODEL_TEST_REQUEST_FAILED'
        );
      }
      const parsed = this.parseAnthropicResponse(responseJson);
      responseText = parsed.responseText;
      tokensUsed = parsed.tokensUsed;
      modelUsed = parsed.modelUsed;

      if (!isModelEquivalent(model.model_key, modelUsed)) {
        throw new ApiError(
          409,
          `Provider model mismatch. Expected ${model.model_key}, got ${modelUsed || 'unknown'}.`,
          'MODEL_PROVIDER_MISMATCH'
        );
      }

      const echoResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.model_key,
          max_tokens: model.max_tokens || 512,
          messages: [{ role: 'user', content: echoPrompt }],
        }),
      });
      const echoJson: any = await echoResponse.json().catch(() => ({}));
      if (!echoResponse.ok) {
        throw new ApiError(
          echoResponse.status,
          echoJson?.error?.message || echoJson?.message || echoResponse.statusText,
          'MODEL_TEST_REQUEST_FAILED'
        );
      }
      modelEcho = this.parseAnthropicResponse(echoJson).responseText || null;
    } else if (provider === 'databricks') {
      const baseEndpoint = (model.endpoint_url || '').replace(/\/+$/, '');
      if (!baseEndpoint) {
        throw new ApiError(400, 'Databricks endpoint URL is required', 'MODEL_TEST_ENDPOINT_MISSING');
      }

      const endpoint = baseEndpoint.includes('/serving-endpoints/')
        ? (baseEndpoint.endsWith('/invocations') ? baseEndpoint : `${baseEndpoint}/invocations`)
        : `${baseEndpoint}/serving-endpoints/${encodeURIComponent(model.model_key)}/invocations`;

      const responseJson = await this.requestWithBearer(endpoint, apiKey, {
        messages: [{ role: 'user', content: prompt }],
      });
      const parsed = this.parseDatabricksResponse(responseJson);
      responseText = parsed.responseText;
      tokensUsed = parsed.tokensUsed;
      modelUsed = parsed.modelUsed;

      if (!isModelEquivalent(model.model_key, modelUsed)) {
        throw new ApiError(
          409,
          `Provider model mismatch. Expected ${model.model_key}, got ${modelUsed || 'unknown'}.`,
          'MODEL_PROVIDER_MISMATCH'
        );
      }

      const echoJson = await this.requestWithBearer(endpoint, apiKey, {
        messages: [{ role: 'user', content: echoPrompt }],
      });
      modelEcho = this.parseDatabricksResponse(echoJson).responseText || null;
    } else {
      throw new ApiError(400, `Provider ${provider || 'unknown'} is not supported for model testing`, 'MODEL_TEST_PROVIDER_UNSUPPORTED');
    }

    const latencyMs = Date.now() - startedAt;
    return {
      success: true,
      responseText: responseText || '(No response text returned by provider)',
      latencyMs,
      tokensUsed,
      modelUsed,
      modelEcho,
    };
  }

  async selectModel(context: Pick<AiExecutionContext, 'modelId' | 'gatewayId' | 'routerId' | 'capabilityKeys'>): Promise<AiSelectionResult> {
    if (context.modelId) {
      const model = await this.loadModelById(context.modelId) as ModelWithCapabilities;
      return { model, gateway: null, router: null };
    }

    const router = context.routerId ? await this.loadRouterById(context.routerId) : null;
    const gateway = context.gatewayId
      ? await this.loadGatewayById(context.gatewayId)
      : router?.primary_gateway_id
        ? await this.loadGatewayById(String(router.primary_gateway_id))
        : null;

    const allowedModelIds = new Set<string>(parseIdList(router?.allowed_model_ids));
    const preferredCostTiers = parseIdList(router?.preferred_cost_tiers);
    const preferredLatencyClass = router?.preferred_latency_class ? String(router.preferred_latency_class) : '';
    const requiredCapabilities = parseIdList(router?.required_capabilities);
    const requestedCapabilities = context.capabilityKeys?.length ? context.capabilityKeys : requiredCapabilities;

    const allModels = await this.loadAllActiveModels();
    let activeModels = allModels.filter((row) => !allowedModelIds.size || allowedModelIds.has(String(row.id)));

    if (requestedCapabilities.length) {
      activeModels = activeModels.filter((row) =>
        requestedCapabilities.every((capability) => row.capabilities.includes(capability))
      );
    }

    if (preferredLatencyClass) {
      const latencyMatches = activeModels.filter((row) => (row.latency_class || '') === preferredLatencyClass);
      if (latencyMatches.length) {
        activeModels = latencyMatches;
      }
    }

    if (preferredCostTiers.length) {
      const byCostTier = preferredCostTiers
        .map((tier) => activeModels.find((row) => (row.model_family || '') === tier))
        .find(Boolean);
      if (byCostTier) {
        activeModels = [byCostTier as ModelWithCapabilities];
      }
    }

    const candidateFromGateway = gateway?.default_model_id || gateway?.failover_model_id || null;
    const selectedFromGateway = candidateFromGateway
      ? activeModels.find((row) => row.id === candidateFromGateway)
      : null;

    if (selectedFromGateway) {
      return { model: selectedFromGateway, gateway, router };
    }

    if (activeModels.length > 0) {
      return { model: activeModels[0], gateway, router };
    }

    const fallbackModelIds = parseIdList(router?.fallback_model_ids);
    if (fallbackModelIds.length) {
      const fallbackPool = allModels.filter((row) => fallbackModelIds.includes(String(row.id)));
      if (fallbackPool.length > 0) {
        return { model: fallbackPool[0], gateway, router };
      }
    }

    throw new ApiError(404, 'No active AI model available for routing', 'NOT_FOUND');
  }

  async enforcePolicies(context: Pick<AiExecutionContext, 'policyId' | 'modelId' | 'capabilityKeys' | 'requestTokens'>) {
    if (!context.policyId) {
      return null;
    }

    const policy = await this.loadPolicyById(context.policyId);
    const blockedModelIds = new Set<string>(parseIdList(policy.blocked_model_ids));
    const allowedCapabilities = new Set<string>(parseIdList(policy.allowed_capabilities));

    if (context.modelId && blockedModelIds.has(context.modelId)) {
      throw new ApiError(403, 'The selected model is blocked by policy', 'POLICY_BLOCKED_MODEL');
    }

    if (policy.max_tokens_per_request && (context.requestTokens || 0) > policy.max_tokens_per_request) {
      throw new ApiError(400, 'Request exceeds the policy token limit', 'POLICY_TOKEN_LIMIT');
    }

    if (allowedCapabilities.size > 0) {
      const requestedCapabilities = (context.capabilityKeys || []).map((entry) => String(entry));
      const unsupportedCapability = requestedCapabilities.find((entry) => !allowedCapabilities.has(entry));
      if (unsupportedCapability) {
        throw new ApiError(403, `Capability ${unsupportedCapability} is not allowed by policy`, 'POLICY_CAPABILITY_BLOCKED');
      }
    }

    return policy;
  }

  private async executeOpenAiChatCompletion(model: ModelWithCapabilities, payload: Record<string, unknown>) {
    const apiKey = model.api_key;
    if (!apiKey) {
      throw new ApiError(400, 'OpenAI model is missing API key configuration', 'OPENAI_KEY_MISSING');
    }

    const endpoint = model.endpoint_url || 'https://api.openai.com/v1/chat/completions';
    const body: Record<string, unknown> = {
      model: model.model_key,
      messages: Array.isArray(payload.messages) ? payload.messages : [],
    };

    if (model.max_tokens) {
      body.max_tokens = model.max_tokens;
    }

    if (typeof payload.temperature === 'number') {
      body.temperature = payload.temperature;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseJson: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `OpenAI request failed: ${responseJson?.error?.message || response.statusText}`,
        'OPENAI_REQUEST_FAILED'
      );
    }

    const providerModel = responseJson?.model ? String(responseJson.model) : null;
    if (!isModelEquivalent(model.model_key, providerModel)) {
      throw new ApiError(
        409,
        `OpenAI provider model mismatch. Expected ${model.model_key}, got ${providerModel || 'unknown'}.`,
        'MODEL_PROVIDER_MISMATCH'
      );
    }

    return {
      provider: 'openai',
      endpoint,
      model: model.model_key,
      response: responseJson,
      usage: responseJson?.usage || null,
    };
  }

  private async executeAnthropicMessages(model: ModelWithCapabilities, payload: Record<string, unknown>) {
    const apiKey = model.api_key;
    if (!apiKey) {
      throw new ApiError(400, 'Anthropic model is missing API key configuration', 'ANTHROPIC_KEY_MISSING');
    }

    const endpoint = model.endpoint_url || 'https://api.anthropic.com/v1/messages';
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const body: Record<string, unknown> = {
      model: model.model_key,
      max_tokens: model.max_tokens || 2048,
      messages,
    };

    if (typeof payload.temperature === 'number') {
      body.temperature = payload.temperature;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const responseJson: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Anthropic request failed: ${responseJson?.error?.message || responseJson?.message || response.statusText}`,
        'ANTHROPIC_REQUEST_FAILED'
      );
    }

    const providerModel = responseJson?.model ? String(responseJson.model) : null;
    if (!isModelEquivalent(model.model_key, providerModel)) {
      throw new ApiError(
        409,
        `Anthropic provider model mismatch. Expected ${model.model_key}, got ${providerModel || 'unknown'}.`,
        'MODEL_PROVIDER_MISMATCH'
      );
    }

    return {
      provider: 'anthropic',
      endpoint,
      model: model.model_key,
      response: responseJson,
      usage: responseJson?.usage || null,
    };
  }

  private async executeDatabricksChatCompletion(model: ModelWithCapabilities, payload: Record<string, unknown>) {
    const apiKey = model.api_key;
    if (!apiKey) {
      throw new ApiError(400, 'Databricks model is missing API key configuration', 'DATABRICKS_KEY_MISSING');
    }

    const baseEndpoint = (model.endpoint_url || '').replace(/\/+$/, '');
    if (!baseEndpoint) {
      throw new ApiError(400, 'Databricks endpoint URL is required', 'DATABRICKS_ENDPOINT_MISSING');
    }

    const endpoint = baseEndpoint.includes('/serving-endpoints/')
      ? (baseEndpoint.endsWith('/invocations') ? baseEndpoint : `${baseEndpoint}/invocations`)
      : `${baseEndpoint}/serving-endpoints/${encodeURIComponent(model.model_key)}/invocations`;

    const body: Record<string, unknown> = {
      messages: Array.isArray(payload.messages) ? payload.messages : [],
    };

    if (typeof payload.temperature === 'number') {
      body.temperature = payload.temperature;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseJson: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Databricks request failed: ${responseJson?.error?.message || responseJson?.message || response.statusText}`,
        'DATABRICKS_REQUEST_FAILED'
      );
    }

    const providerModel = responseJson?.metadata?.model_name ? String(responseJson.metadata.model_name) : null;
    if (providerModel && !isModelEquivalent(model.model_key, providerModel)) {
      throw new ApiError(
        409,
        `Databricks provider model mismatch. Expected ${model.model_key}, got ${providerModel || 'unknown'}.`,
        'MODEL_PROVIDER_MISMATCH'
      );
    }

    return {
      provider: 'databricks',
      endpoint,
      model: model.model_key,
      response: responseJson,
      usage: responseJson?.usage || null,
    };
  }

  async executeRequest(model: ModelWithCapabilities, payload: Record<string, unknown>) {
    const provider = (model.provider || '').toLowerCase();
    if (provider === 'openai') {
      return this.executeOpenAiChatCompletion(model, payload);
    }
    if (provider === 'anthropic') {
      return this.executeAnthropicMessages(model, payload);
    }
    if (provider === 'databricks') {
      return this.executeDatabricksChatCompletion(model, payload);
    }

    throw new ApiError(501, `Provider ${model.provider || 'unknown'} is not implemented`, 'PROVIDER_NOT_IMPLEMENTED');
  }

  async logUsage(entry: {
    modelId?: string | null;
    gatewayId?: string | null;
    routerId?: string | null;
    policyId?: string | null;
    requestTokens?: number | null;
    responseTokens?: number | null;
    status?: string;
    requestPayload?: Record<string, unknown>;
    responsePayload?: Record<string, unknown>;
  }) {
    const result = await db.query(
      `INSERT INTO ai_usage_logs
         (model_id, gateway_id, router_id, policy_id, request_tokens, response_tokens, status, request_payload, response_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
       RETURNING id, created_at`,
      [
        entry.modelId || null,
        entry.gatewayId || null,
        entry.routerId || null,
        entry.policyId || null,
        entry.requestTokens || null,
        entry.responseTokens || null,
        entry.status || 'success',
        JSON.stringify(entry.requestPayload || {}),
        JSON.stringify(entry.responsePayload || {}),
      ]
    );

    return result.rows[0];
  }

  async execute(context: AiExecutionContext) {
    const policy = await this.enforcePolicies(context);
    const selection = await this.selectModel({
      ...context,
      routerId: context.routerId || policy?.default_router_id || undefined,
    });
    const responsePayload = await this.executeRequest(selection.model, context.payload || {});
    const usagePayload = (responsePayload && 'usage' in responsePayload) ? (responsePayload as any).usage : null;
    const usageRequestTokens = usagePayload?.prompt_tokens || context.requestTokens || null;
    const usageResponseTokens = usagePayload?.completion_tokens || context.responseTokens || null;

    const usage = await this.logUsage({
      modelId: selection.model.id,
      gatewayId: selection.gateway?.id || null,
      routerId: selection.router?.id || null,
      policyId: policy?.id || context.policyId || null,
      requestTokens: usageRequestTokens,
      responseTokens: usageResponseTokens,
      status: 'success',
      requestPayload: context.payload || {},
      responsePayload,
    });

    return {
      selection,
      policy,
      result: responsePayload,
      usage,
    };
  }
}

export default new AiExecutionService();