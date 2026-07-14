# Common Data Model

This document defines how RediForge uses the Common Data Model (CDM) in Object Inventory and how Databricks metadata ingestion supports application data definitions.

## Purpose

The Common Data Model provides a shared, object-level definition for:

- CDM attributes
- CDM relationships
- CDM business rules

It is managed separately from application-specific data definitions so each application can keep its own physical metadata while sharing common business definitions.

## Data Structure

### common_data_model

One row per global object.

- id
- global_object_id
- object_name
- notes
- created_at
- updated_at

### cdm_attributes

CDM attribute rows for a common data model.

- id
- common_data_model_id
- attribute_name
- attribute_description
- data_type
- length
- business_rules
- sort_order
- created_at
- updated_at

### cdm_relationships

Relationship rows connected to a common data model.

- id
- common_data_model_id
- source_attribute_id
- source_attribute_name
- target_object_name
- target_attribute_name
- relationship_type
- business_rules
- sort_order
- created_at
- updated_at

## API

Base route: `/api/cdm`

- `GET /:objectId`
  - Returns model, attributes, and relationships for a global object.
- `POST /:objectId`
  - Upserts model-level data and saves CDM attributes/relationships.
- `PUT /:objectId/attribute/:attributeId`
  - Updates one CDM attribute row.
- `DELETE /:objectId/attribute/:attributeId`
  - Deletes one CDM attribute row.

## UI Integration

- The object table action `Assign Application` opens the dedicated `CommonDataModelModal`.
- The Applications & Data Definitions panel remains focused on application-specific sub-objects and fields.
- Common Data Model is shown as a distinct, muted row in the sidebar with a divider and layers icon.

## Databricks Metadata Ingestion

Within an application data definition:

- Use `Pull Metadata from Databricks`.
- Select catalog, schema, and table from live cascading dropdowns.
- The sync imports and updates field definitions including:
  - field name
  - label (from comment when available)
  - data type
  - length
  - required/nullability indicator
  - key indicator
- A `Last Synced` timestamp is shown per linked application definition.
