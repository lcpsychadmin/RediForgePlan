# Canonical Data Platform Settings

This document describes how Databricks and dbt integrate with RediForge Settings to support canonical-model and target-projection workflows.

## Overview

RediForge now includes two integration sections in Settings:

- Databricks Integration
- dbt Integration

Each section supports:

- Global defaults
- Project-level overrides
- Dynamic values displayed as chips/tags
- Validation actions (test connection, validate paths, list metadata)

Settings are persisted in the existing hierarchy preferences state so they can be consumed by planning/design features without introducing a new persistence model.

## Databricks Integration

### Fields

- Workspace URL
- Personal Access Token
- Default Catalog
- Default Schema
- Enable Metadata Sync
- Metadata Sync Frequency (`manual`, `daily`, `weekly`)

### API Endpoints

- `GET /api/settings/databricks`
- `PUT /api/settings/databricks`
- `POST /api/settings/databricks/test-connection`
- `GET /api/settings/databricks/catalogs`
- `GET /api/settings/databricks/schemas`
- `POST /api/settings/databricks/metadata/fetch`

### Service

`server/src/services/databricksService.ts`

- `testConnection()`
- `fetchMetadata()`
- `listCatalogs()`
- `listSchemas()`

## dbt Integration

### Fields

- dbt Project Root Path
- dbt Profiles Path
- Target Profile Name
- Environment (`dev`, `test`, `prod`)
- Enable Canonical Layer
- Canonical Model Folder Path (default: `/models/canonical`)
- Target Projection Folder Path (default: `/models/targets`)

### API Endpoints

- `GET /api/settings/dbt`
- `PUT /api/settings/dbt`
- `POST /api/settings/dbt/validate-paths`
- `GET /api/settings/dbt/models`
- `POST /api/settings/dbt/run-command`
- `GET /api/settings/dbt/manifest`

### Service

`server/src/services/dbtService.ts`

- `validatePaths()`
- `listModels()`
- `runDbtCommand()`
- `getDbtManifest()`

## Canonical -> Target Mapping Flow

### Example Flow 1: Canonical model as source of truth

1. A canonical model is authored under `/models/canonical/customer.sql`.
2. dbt builds canonical entities using standard naming and key policies.
3. Target projection models under `/models/targets/erp_customer.sql` and `/models/targets/crm_customer.sql` map canonical fields to system-specific structures.
4. Databricks metadata sync updates available catalogs/schemas in Settings.
5. RediForge planning features consume these settings for process-area and object planning context.

### Example Flow 2: Project override for multi-program rollout

1. Global defaults point to the enterprise Databricks workspace and shared dbt project root.
2. Program A sets a project override to use a dedicated catalog and schema.
3. Program B keeps global defaults unchanged.
4. Effective configuration is shown in the Global Defaults tables for each integration section.

## Configuration Storage

Settings are stored in `global_hierarchy_preferences.hierarchy_state` under these keys:

- `databricksIntegrationSettings`
- `databricksProjectOverrides`
- `dbtIntegrationSettings`
- `dbtProjectOverrides`

These keys are explicitly preserved when hierarchy state updates occur, preventing accidental wipe-outs during unrelated settings saves.
