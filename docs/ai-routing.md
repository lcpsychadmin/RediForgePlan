# AI Routing

## Routing Governance Location

AI routing governance is managed from Settings under AI and Model Routing.

Primary configuration page:

- AI Routing Rules

## AI Routing Rules Fields

- Default Gateway
- Default Router
- Routing Strategy
- Cost Ceiling
- Provider Preferences
- Fallback Logic
- Enable per-object AI overrides

These settings are persisted via:

- GET /api/ai/routing-rules
- PUT /api/ai/routing-rules

## Object Inventory Changes

Object Inventory no longer contains AI routing controls.

Removed from inventory tables:

- AI ROUTING column
- Assign AI Routing actions

## Optional Object AI Overrides

When AI overrides are enabled in AI Routing Rules, an object workspace tab can be used:

- /objects/:objectId/ai-overrides

This page updates object-level routing via:

- GET /api/ai/object-routing/global-object-id-by-code?objectId=...
- GET /api/ai/object-routing/:globalObjectId
- PUT /api/ai/object-routing
