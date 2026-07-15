# Object Inventory

## Overview

Object Inventory is now a page-based workflow centered on object workspaces.

Key updates:

- Object inventory tables no longer include AI routing assignment controls.
- Object inventory actions include Open Object Page for direct navigation.
- Object-level editing is performed on dedicated object pages instead of modal dialogs.

## Object Workspace Routes

- /objects/:objectId
- /objects/:objectId/applications
- /objects/:objectId/cdm
- /objects/:objectId/relationships
- /objects/:objectId/metadata
- /objects/:objectId/ai-overrides (only shown when AI overrides are enabled)

## Inventory Table Behavior

### Object Catalog

- Includes object identity and process area maintenance.
- Includes Open Object Page in row actions.
- Keeps catalog management actions such as edit/delete/add to project inventory.

### Project Inventory

- Includes execution-planning fields (complexity, disposition, build type, object type).
- Includes Open Object Page in row actions.
- No AI routing column and no Assign AI Routing button.

## Why This Changed

The page-based model reduces modal churn, supports deeper workflows per object, and aligns AI routing governance to settings-level policy management.
