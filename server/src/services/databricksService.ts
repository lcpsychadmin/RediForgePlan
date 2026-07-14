import { DatabricksIntegrationSettings } from '../constants/integrationSettings.js';

interface DatabricksRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

class DatabricksService {
  private normalizeHostname(serverHostname: string): string {
    return String(serverHostname || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }

  private normalizeWorkspaceUrl(workspaceUrl: string): string {
    return String(workspaceUrl || '').trim().replace(/\/+$/, '');
  }

  private resolveBaseUrl(settings: DatabricksIntegrationSettings): string {
    const explicitWorkspaceUrl = this.normalizeWorkspaceUrl(settings.workspaceUrl);
    if (explicitWorkspaceUrl) return explicitWorkspaceUrl;

    const normalizedHostname = this.normalizeHostname(settings.serverHostname);
    return normalizedHostname ? `https://${normalizedHostname}` : '';
  }

  private extractWarehouseId(httpPath: string): string {
    const normalizedPath = String(httpPath || '').trim();
    const match = normalizedPath.match(/\/sql\/1\.0\/warehouses\/([^/?]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  }

  private async request(settings: DatabricksIntegrationSettings, endpoint: string, options: DatabricksRequestOptions = {}): Promise<Record<string, any>> {
    const baseUrl = this.resolveBaseUrl(settings);
    if (!baseUrl || !settings.personalAccessToken) {
      throw new Error('Server Hostname (or Workspace URL) and Personal Access Token are required.');
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
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
    const warehouseId = this.extractWarehouseId(settings.httpPath);
    if (!warehouseId) {
      throw new Error('A valid HTTP Path is required (expected format: /sql/1.0/warehouses/<warehouse-id>).');
    }

    const payload = await this.request(settings, `/api/2.0/sql/warehouses/${encodeURIComponent(warehouseId)}`);
    return {
      ok: true,
      message: 'Databricks connection succeeded.',
      warehouseId,
      warehouseName: String(payload?.name || ''),
      warehouseState: String(payload?.state || ''),
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
