# AI Integration

RediForge now supports a multi-model AI control plane with four management surfaces:

- Model Registry: registers model keys, providers, model families, pricing, and supported capabilities.
- AI Gateways: stores provider endpoints plus default and failover model assignments.
- AI Routers: routes requests across gateways and constrains the allowed model set.
- Usage Policies: enforces token, request, capability, and model restrictions.

## API Surface

- `GET /api/ai/models`
- `POST /api/ai/models`
- `PUT /api/ai/models/:modelId`
- `DELETE /api/ai/models/:modelId`
- `GET /api/ai/models/:modelId/capabilities`
- `POST /api/ai/models/:modelId/capabilities`
- `DELETE /api/ai/models/:modelId/capabilities/:capabilityId`
- `GET /api/ai/gateways`
- `GET /api/ai/routers`
- `GET /api/ai/policies`
- `POST /api/ai/execute`

## Inventory Assignments

- Global objects can store default gateway and default router assignments.
- Project objects can store gateway and router overrides.

## Routing Flow

1. A request enters the execution service.
2. The selected policy is enforced first.
3. The router determines the preferred gateway and eligible models.
4. The gateway can supply a default or failover model.
5. Usage is logged to `ai_usage_logs`.

The current execution path is intentionally lightweight and returns a simulated payload so the registry and governance layers can be exercised without a provider-specific adapter yet.