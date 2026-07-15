# Common Data Model

## Overview

Common Data Model management is page-based and attached to object workspace routes.

Route:

- /objects/:objectId/cdm

The Common Data Model page presents object-level definitions without modal editing.

## Terminology

User-facing labels use these terms:

- Attribute
- Relationships
- Attribute Name
- Description
- Data Type
- Length
- Business Rules

CDM-prefixed labels are no longer used in object editing surfaces.

## Data Structures

### common_data_model

One row per global object.

- id
- global_object_id
- object_name
- notes
- created_at
- updated_at

### cdm_attributes

Attribute rows for a common data model.

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

Base route: /api/common-data-model/object

- GET /:objectId
  - Returns model, attributes, and relationships for a global object.
- PUT /:objectId
  - Upserts model-level data and saves attributes/relationships.

## Related Object Pages

- Applications: /objects/:objectId/applications
- Relationships: /objects/:objectId/relationships
- Metadata: /objects/:objectId/metadata

Databricks metadata sync is available on object metadata workflows and no longer requires modal-based object editing.
