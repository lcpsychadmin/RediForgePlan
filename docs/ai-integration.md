# AI Integration

RediForge now supports a multi-model AI control plane with four management surfaces:

- Model Registry: registers model keys, providers, model families, pricing, and supported capabilities.
- AI Gateways: stores provider endpoints plus default and failover model assignments.
- AI Routers: routes requests across gateways and constrains the allowed model set.
- Usage Policies: enforces token, request, capability, and model restrictions.

## OpenAI Models

- OpenAI API keys authorize an account and do not pick a model by themselves.
- Model selection happens in the request payload (`model`) and is sourced from Model Registry.
- RediForge stores OpenAI `modelName` exactly as entered (for example `gpt-4o-mini`) and passes that through to OpenAI.

### OpenAI Registration Example

Example fields in Model Registry:

- Provider: `OpenAI`
- Model Name: `gpt-4o-mini`
- Endpoint URL: `https://api.openai.com/v1/chat/completions`
- API Key: `sk-...`
- Cost Tier: `standard`
- Capabilities: `chat`, `reasoning`
- Max Tokens: `4096`
- Enabled: `true`

### OpenAI Execution Payload

When a routed OpenAI model is selected, the execution engine sends:

- `POST https://api.openai.com/v1/chat/completions`
- `Authorization: Bearer <apiKey>`
- JSON body includes:
	- `model: <modelName from registry>`
	- `messages: [...]`

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

OpenAI provider invocation is now active via chat completions. Other providers remain adapter-ready and continue to return a simulated payload until their provider adapters are enabled.