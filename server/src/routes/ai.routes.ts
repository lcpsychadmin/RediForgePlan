import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import db from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { formatListResponse, formatSingleResponse } from '../utils/responseFormatter.js';
import aiExecutionService from '../services/aiExecutionService.js';

const router = Router();

const parseStringList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const asJsonArray = (value: unknown) => JSON.stringify(parseStringList(value));

router.get('/models', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT
         m.id, m.model_key, m.display_name, m.provider, m.model_family, m.context_window,
         m.input_cost_per_1k_tokens, m.output_cost_per_1k_tokens, m.is_active, m.created_at, m.updated_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', c.id,
               'capabilityKey', c.capability_key,
               'description', c.description,
               'isSupported', c.is_supported
             )
             ORDER BY c.capability_key
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'::json
         ) AS capabilities
       FROM ai_models m
       LEFT JOIN ai_model_capabilities c ON c.model_id = m.id
       GROUP BY m.id
       ORDER BY m.display_name ASC`
    );

    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/models', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelKey, displayName, provider, modelFamily, contextWindow, inputCostPer1kTokens, outputCostPer1kTokens, isActive } = req.body || {};
    if (!modelKey?.trim()) {
      throw new ApiError(400, 'Model key is required', 'MISSING_FIELD');
    }
    if (!displayName?.trim()) {
      throw new ApiError(400, 'Display name is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO ai_models
         (model_key, display_name, provider, model_family, context_window, input_cost_per_1k_tokens, output_cost_per_1k_tokens, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, model_key, display_name, provider, model_family, context_window, input_cost_per_1k_tokens, output_cost_per_1k_tokens, is_active, created_at, updated_at`,
      [
        modelKey.trim(),
        displayName.trim(),
        provider || null,
        modelFamily || null,
        contextWindow || null,
        inputCostPer1kTokens || null,
        outputCostPer1kTokens || null,
        isActive !== false,
      ]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/models/:modelId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelKey, displayName, provider, modelFamily, contextWindow, inputCostPer1kTokens, outputCostPer1kTokens, isActive } = req.body || {};
    const result = await db.query(
      `UPDATE ai_models
       SET model_key = COALESCE($1, model_key),
           display_name = COALESCE($2, display_name),
           provider = $3,
           model_family = $4,
           context_window = $5,
           input_cost_per_1k_tokens = $6,
           output_cost_per_1k_tokens = $7,
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, model_key, display_name, provider, model_family, context_window, input_cost_per_1k_tokens, output_cost_per_1k_tokens, is_active, created_at, updated_at`,
      [
        modelKey?.trim() || null,
        displayName?.trim() || null,
        provider || null,
        modelFamily || null,
        contextWindow || null,
        inputCostPer1kTokens || null,
        outputCostPer1kTokens || null,
        isActive === undefined ? null : Boolean(isActive),
        req.params.modelId,
      ]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI model not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/models/:modelId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM ai_models WHERE id = $1', [req.params.modelId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/models/:modelId/capabilities', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT id, model_id, capability_key, description, is_supported, created_at, updated_at
       FROM ai_model_capabilities
       WHERE model_id = $1
       ORDER BY capability_key ASC`,
      [req.params.modelId]
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/models/:modelId/capabilities', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { capabilityKey, description, isSupported } = req.body || {};
    if (!capabilityKey?.trim()) {
      throw new ApiError(400, 'Capability key is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO ai_model_capabilities (model_id, capability_key, description, is_supported)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (model_id, capability_key)
       DO UPDATE SET description = EXCLUDED.description, is_supported = EXCLUDED.is_supported, updated_at = CURRENT_TIMESTAMP
       RETURNING id, model_id, capability_key, description, is_supported, created_at, updated_at`,
      [req.params.modelId, capabilityKey.trim(), description || null, isSupported !== false]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/models/:modelId/capabilities/:capabilityId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM ai_model_capabilities WHERE id = $1 AND model_id = $2', [req.params.capabilityId, req.params.modelId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/gateways', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.description, g.endpoint_url, g.auth_type, g.default_model_id, dm.display_name AS default_model_name,
              g.failover_model_id, fm.display_name AS failover_model_name, g.is_active, g.created_at, g.updated_at
       FROM ai_gateways g
       LEFT JOIN ai_models dm ON dm.id = g.default_model_id
       LEFT JOIN ai_models fm ON fm.id = g.failover_model_id
       ORDER BY g.name ASC`
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/gateways', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, endpointUrl, authType, defaultModelId, failoverModelId, isActive } = req.body || {};
    if (!name?.trim()) {
      throw new ApiError(400, 'Gateway name is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO ai_gateways (name, description, endpoint_url, auth_type, default_model_id, failover_model_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, endpoint_url, auth_type, default_model_id, failover_model_id, is_active, created_at, updated_at`,
      [name.trim(), description || null, endpointUrl || null, authType || null, defaultModelId || null, failoverModelId || null, isActive !== false]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/gateways/:gatewayId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, endpointUrl, authType, defaultModelId, failoverModelId, isActive } = req.body || {};
    const result = await db.query(
      `UPDATE ai_gateways
       SET name = COALESCE($1, name),
           description = $2,
           endpoint_url = $3,
           auth_type = $4,
           default_model_id = $5,
           failover_model_id = $6,
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, name, description, endpoint_url, auth_type, default_model_id, failover_model_id, is_active, created_at, updated_at`,
      [name?.trim() || null, description || null, endpointUrl || null, authType || null, defaultModelId || null, failoverModelId || null, isActive === undefined ? null : Boolean(isActive), req.params.gatewayId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI gateway not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/gateways/:gatewayId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM ai_gateways WHERE id = $1', [req.params.gatewayId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/routers', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.name, r.description, r.strategy, r.primary_gateway_id, pg.name AS primary_gateway_name,
              r.fallback_gateway_id, fg.name AS fallback_gateway_name, r.allowed_model_ids, r.is_active, r.created_at, r.updated_at
       FROM ai_routers r
       LEFT JOIN ai_gateways pg ON pg.id = r.primary_gateway_id
       LEFT JOIN ai_gateways fg ON fg.id = r.fallback_gateway_id
       ORDER BY r.name ASC`
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/routers', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, strategy, primaryGatewayId, fallbackGatewayId, allowedModelIds, isActive } = req.body || {};
    if (!name?.trim()) {
      throw new ApiError(400, 'Router name is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO ai_routers (name, description, strategy, primary_gateway_id, fallback_gateway_id, allowed_model_ids, is_active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id, name, description, strategy, primary_gateway_id, fallback_gateway_id, allowed_model_ids, is_active, created_at, updated_at`,
      [name.trim(), description || null, strategy || null, primaryGatewayId || null, fallbackGatewayId || null, asJsonArray(allowedModelIds), isActive !== false]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/routers/:routerId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, strategy, primaryGatewayId, fallbackGatewayId, allowedModelIds, isActive } = req.body || {};
    const result = await db.query(
      `UPDATE ai_routers
       SET name = COALESCE($1, name),
           description = $2,
           strategy = $3,
           primary_gateway_id = $4,
           fallback_gateway_id = $5,
           allowed_model_ids = $6::jsonb,
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, name, description, strategy, primary_gateway_id, fallback_gateway_id, allowed_model_ids, is_active, created_at, updated_at`,
      [name?.trim() || null, description || null, strategy || null, primaryGatewayId || null, fallbackGatewayId || null, asJsonArray(allowedModelIds), isActive === undefined ? null : Boolean(isActive), req.params.routerId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI router not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/routers/:routerId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM ai_routers WHERE id = $1', [req.params.routerId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/policies', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.description, p.max_requests_per_minute, p.max_tokens_per_request,
              p.allowed_capabilities, p.blocked_model_ids, p.default_router_id, r.name AS default_router_name,
              p.is_active, p.created_at, p.updated_at
       FROM ai_usage_policies p
       LEFT JOIN ai_routers r ON r.id = p.default_router_id
       ORDER BY p.name ASC`
    );
    res.json(formatListResponse(result.rows, result.rows.length));
  } catch (error) {
    next(error);
  }
});

router.post('/policies', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, maxRequestsPerMinute, maxTokensPerRequest, allowedCapabilities, blockedModelIds, defaultRouterId, isActive } = req.body || {};
    if (!name?.trim()) {
      throw new ApiError(400, 'Policy name is required', 'MISSING_FIELD');
    }

    const result = await db.query(
      `INSERT INTO ai_usage_policies
         (name, description, max_requests_per_minute, max_tokens_per_request, allowed_capabilities, blocked_model_ids, default_router_id, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       RETURNING id, name, description, max_requests_per_minute, max_tokens_per_request, allowed_capabilities, blocked_model_ids, default_router_id, is_active, created_at, updated_at`,
      [name.trim(), description || null, maxRequestsPerMinute || null, maxTokensPerRequest || null, asJsonArray(allowedCapabilities), asJsonArray(blockedModelIds), defaultRouterId || null, isActive !== false]
    );

    res.status(201).json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/policies/:policyId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, maxRequestsPerMinute, maxTokensPerRequest, allowedCapabilities, blockedModelIds, defaultRouterId, isActive } = req.body || {};
    const result = await db.query(
      `UPDATE ai_usage_policies
       SET name = COALESCE($1, name),
           description = $2,
           max_requests_per_minute = $3,
           max_tokens_per_request = $4,
           allowed_capabilities = $5::jsonb,
           blocked_model_ids = $6::jsonb,
           default_router_id = $7,
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, name, description, max_requests_per_minute, max_tokens_per_request, allowed_capabilities, blocked_model_ids, default_router_id, is_active, created_at, updated_at`,
      [name?.trim() || null, description || null, maxRequestsPerMinute || null, maxTokensPerRequest || null, asJsonArray(allowedCapabilities), asJsonArray(blockedModelIds), defaultRouterId || null, isActive === undefined ? null : Boolean(isActive), req.params.policyId]
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'AI usage policy not found', 'NOT_FOUND');
    }

    res.json(formatSingleResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/policies/:policyId', requireAuth, requireRole('analyst', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.query('DELETE FROM ai_usage_policies WHERE id = $1', [req.params.policyId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/execute', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiExecutionService.execute({
      modelId: req.body?.modelId,
      gatewayId: req.body?.gatewayId,
      routerId: req.body?.routerId,
      policyId: req.body?.policyId,
      capabilityKeys: req.body?.capabilityKeys,
      requestTokens: req.body?.requestTokens,
      responseTokens: req.body?.responseTokens,
      payload: req.body?.payload || {},
    });

    res.json(formatSingleResponse(result));
  } catch (error) {
    next(error);
  }
});

export default router;