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

const parseIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry)).filter(Boolean);
};

class AiExecutionService {
  private async loadModelById(modelId: string) {
    const result = await db.query(
      `SELECT id, model_key, display_name, provider, model_family, context_window,
              input_cost_per_1k_tokens, output_cost_per_1k_tokens, is_active, created_at, updated_at
       FROM ai_models
       WHERE id = $1`,
      [modelId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI model not found', 'NOT_FOUND');
    }

    return result.rows[0];
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
      `SELECT id, name, description, strategy, primary_gateway_id, fallback_gateway_id, allowed_model_ids, is_active, created_at, updated_at
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

  async selectModel(context: Pick<AiExecutionContext, 'modelId' | 'gatewayId' | 'routerId' | 'capabilityKeys'>): Promise<AiSelectionResult> {
    if (context.modelId) {
      const model = await this.loadModelById(context.modelId);
      return { model, gateway: null, router: null };
    }

    const router = context.routerId ? await this.loadRouterById(context.routerId) : null;
    const gateway = context.gatewayId
      ? await this.loadGatewayById(context.gatewayId)
      : router?.primary_gateway_id
        ? await this.loadGatewayById(String(router.primary_gateway_id))
        : null;

    const allowedModelIds = new Set<string>([...parseIdList(router?.allowed_model_ids)]);
    const candidateRows = await db.query(
      `SELECT id, model_key, display_name, provider, model_family, context_window,
              input_cost_per_1k_tokens, output_cost_per_1k_tokens, is_active, created_at, updated_at
       FROM ai_models
       WHERE is_active = TRUE
       ORDER BY display_name ASC`
    );

    const activeModels = candidateRows.rows.filter((row) => !allowedModelIds.size || allowedModelIds.has(String(row.id)));
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

  async executeRequest(model: any, payload: Record<string, unknown>) {
    return {
      simulated: true,
      message: 'AI execution routing is wired; provider invocation can be attached later.',
      modelKey: model.model_key,
      provider: model.provider || null,
      payload,
    };
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

    const usage = await this.logUsage({
      modelId: selection.model.id,
      gatewayId: selection.gateway?.id || null,
      routerId: selection.router?.id || null,
      policyId: policy?.id || context.policyId || null,
      requestTokens: context.requestTokens || null,
      responseTokens: context.responseTokens || null,
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