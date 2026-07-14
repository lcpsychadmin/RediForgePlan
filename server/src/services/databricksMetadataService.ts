import db from '../db.js';

interface DatabricksColumn {
  name: string;
  comment?: string;
  type_text?: string;
  type_name?: string;
  type_precision?: number;
  nullable?: boolean;
  is_nullable?: boolean;
  partition_index?: number;
}

interface DatabricksTableMetadata {
  columns: DatabricksColumn[];
  tableFullName: string;
}

class DatabricksMetadataService {
  private normalizeWorkspaceUrl(workspaceUrl: string): string {
    return String(workspaceUrl || '').trim().replace(/\/+$/, '');
  }

  private async getDatabricksSettings() {
    const result = await db.query(
      `SELECT hierarchy_state FROM global_hierarchy_preferences WHERE id = 1`
    );
    const state = result.rows[0]?.hierarchy_state || {};
    const settings = state?.databricksIntegrationSettings || {};

    return {
      workspaceUrl: String(settings.workspaceUrl || '').trim(),
      personalAccessToken: String(settings.personalAccessToken || '').trim(),
    };
  }

  async fetchTableMetadata(catalog: string, schema: string, table: string): Promise<DatabricksTableMetadata> {
    const settings = await this.getDatabricksSettings();
    if (!settings.workspaceUrl || !settings.personalAccessToken) {
      throw new Error('Databricks integration settings are not configured.');
    }

    const tableFullName = `${catalog}.${schema}.${table}`;
    const workspaceUrl = this.normalizeWorkspaceUrl(settings.workspaceUrl);

    const response = await fetch(
      `${workspaceUrl}/api/2.0/unity-catalog/tables/${encodeURIComponent(tableFullName)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.personalAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch Databricks table metadata (${response.status}): ${text || response.statusText}`);
    }

    const payload = (await response.json()) as Record<string, any>;
    const columns = Array.isArray(payload?.columns)
      ? payload.columns
      : Array.isArray(payload?.data_schema?.columns)
        ? payload.data_schema.columns
        : [];

    return {
      columns: columns.map((column: any) => ({
        name: String(column?.name || ''),
        comment: String(column?.comment || ''),
        type_text: String(column?.type_text || column?.type || ''),
        type_name: String(column?.type_name || ''),
        type_precision: Number(column?.type_precision || 0) || undefined,
        nullable: typeof column?.nullable === 'boolean' ? column.nullable : undefined,
        is_nullable: typeof column?.is_nullable === 'boolean' ? column.is_nullable : undefined,
        partition_index: Number(column?.partition_index || 0) || undefined,
      })),
      tableFullName,
    };
  }

  mapMetadataToFieldDefinitions(metadata: DatabricksTableMetadata) {
    return metadata.columns
      .filter((column) => !!column.name)
      .map((column, index) => {
        const nullable = typeof column.nullable === 'boolean'
          ? column.nullable
          : typeof column.is_nullable === 'boolean'
            ? column.is_nullable
            : true;

        return {
          tableName: metadata.tableFullName,
          fieldName: column.name,
          fieldLabel: column.comment || column.name,
          dataType: column.type_text || column.type_name || 'string',
          length: column.type_precision || null,
          decimals: null,
          isKey: column.partition_index !== undefined && column.partition_index > 0,
          isRequired: !nullable,
          businessProcessRequired: false,
          description: column.comment || null,
          fieldMetadata: {
            source: 'databricks',
            nullable,
            databricksTypeName: column.type_name || null,
            databricksTypeText: column.type_text || null,
          },
          sortOrder: index,
        };
      });
  }
}

const databricksMetadataService = new DatabricksMetadataService();
export default databricksMetadataService;
