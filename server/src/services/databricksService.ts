import { DatabricksIntegrationSettings } from '../constants/integrationSettings.js';

interface DatabricksRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

class DatabricksService {
  private normalizeWorkspaceUrl(workspaceUrl: string): string {
    return String(workspaceUrl || '').trim().replace(/\/+$/, '');
  }

  private async request(settings: DatabricksIntegrationSettings, endpoint: string, options: DatabricksRequestOptions = {}): Promise<Record<string, any>> {
    const workspaceUrl = this.normalizeWorkspaceUrl(settings.workspaceUrl);
    if (!workspaceUrl || !settings.personalAccessToken) {
      throw new Error('Workspace URL and Personal Access Token are required.');
    }

    const response = await fetch(`${workspaceUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${settings.personalAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Databricks API request failed (${response.status}): ${text || response.statusText}`);
    }

    return response.json() as Promise<Record<string, any>>;
  }

  async testConnection(settings: DatabricksIntegrationSettings) {
    const payload = await this.request(settings, '/api/2.0/clusters/list');
    return {
      ok: true,
      message: 'Databricks connection succeeded.',
      clusterCount: Array.isArray(payload?.clusters) ? payload.clusters.length : 0,
    };
  }

  async listCatalogs(settings: DatabricksIntegrationSettings): Promise<string[]> {
    const payload = await this.request(settings, '/api/2.0/unity-catalog/catalogs');
    const catalogs = Array.isArray(payload?.catalogs) ? payload.catalogs : [];
    return catalogs
      .map((catalog: any) => String(catalog?.name || '').trim())
      .filter(Boolean);
  }

  async listSchemas(settings: DatabricksIntegrationSettings, catalogName?: string): Promise<string[]> {
    const catalog = String(catalogName || settings.defaultCatalog || '').trim();
    const endpoint = catalog
      ? `/api/2.0/unity-catalog/schemas?catalog_name=${encodeURIComponent(catalog)}`
      : '/api/2.0/unity-catalog/schemas';

    const payload = await this.request(settings, endpoint);
    const schemas = Array.isArray(payload?.schemas) ? payload.schemas : [];
    return schemas
      .map((schema: any) => String(schema?.name || '').trim())
      .filter(Boolean);
  }

  async fetchMetadata(settings: DatabricksIntegrationSettings) {
    const catalogs = await this.listCatalogs(settings);
    const defaultCatalog = settings.defaultCatalog || catalogs[0] || '';
    const schemas = await this.listSchemas(settings, defaultCatalog);

    return {
      catalogs,
      schemas,
      defaultCatalog,
    };
  }
}

const databricksService = new DatabricksService();
export default databricksService;
