# Common Data Model Integration

This document defines the Common Data Model (CDM) support added to RediForge Data Object Inventory and explains Databricks metadata ingestion.

## Goals

- Replace the legacy Data Construction Template workflow.
- Support canonical attribute modeling at the global object level.
- Ingest physical metadata from Databricks Unity Catalog into application data definitions.
- Keep application-specific and canonical definitions connected but independently maintainable.

## Data Model

### common_data_model

Stores one canonical model row per global object.

- `id` UUID primary key
- `global_object_id` UUID unique reference to global object
- `object_name` canonical object label
- `object_description` optional
- `created_at`, `updated_at`

### canonical_attributes

Stores canonical attributes for a canonical object.

- `id` UUID primary key
- `common_data_model_id` UUID foreign key
- `canonical_attribute_name` required
- `canonical_description` optional
- `canonical_data_type` optional
- `canonical_length` optional integer
- `canonical_business_rules` optional
- `relationships` optional
- `sort_order` integer
- `created_at`, `updated_at`

### Legacy cleanup

Migration removes:

- `construction_template_fields`
- `construction_templates`

## API Endpoints

### Common model

- `GET /api/common-model/object/:globalObjectId`
  - Returns the model row and canonical attributes.
- `PUT /api/common-model/object/:globalObjectId`
  - Upserts object-level common model metadata.
- `POST /api/common-model/object/:globalObjectId/attributes`
  - Creates a canonical attribute.
- `PUT /api/common-model/attributes/:attributeId`
  - Updates a canonical attribute.
- `DELETE /api/common-model/attributes/:attributeId`
  - Deletes a canonical attribute.

### Databricks ingestion

- `POST /api/applications/data-definitions/:definitionId/metadata-sync`
  - Request body:
    - `catalog`
    - `schema`
    - `table`
  - Reads Databricks integration settings from `global_hierarchy_preferences.hierarchy_state.databricksIntegrationSettings`.
  - Fetches table metadata from Unity Catalog and maps columns into `data_definition_fields` rows.
  - Replaces existing data definition field rows for that definition with synced metadata.

## UI Behavior

In the Data Definitions panel:

- Application list includes a pseudo-row named **Common Data Model**.
- Selecting Common Data Model opens canonical attribute management.
- For normal application data definitions, a **Pull Metadata from Databricks** action is available.
- Sync status is tracked per data definition and displayed in the application list.

## Operational Notes

- Databricks metadata sync is destructive for existing fields on the selected data definition; current rows are replaced by synced metadata.
- Canonical attributes remain separate from per-application physical metadata to support harmonization.
- If Databricks settings are missing or invalid, metadata sync fails with an actionable API error.
