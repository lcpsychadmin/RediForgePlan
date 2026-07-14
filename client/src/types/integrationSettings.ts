export type MetadataSyncFrequency = 'manual' | 'daily' | 'weekly';
export type DbtEnvironment = 'dev' | 'test' | 'prod';

export interface DatabricksIntegrationSettings {
  workspaceUrl: string;
  personalAccessToken: string;
  defaultCatalog: string;
  defaultSchema: string;
  metadataSyncEnabled: boolean;
  metadataSyncFrequency: MetadataSyncFrequency;
}

export interface DbtIntegrationSettings {
  dbtProjectRootPath: string;
  dbtProfilesPath: string;
  targetProfileName: string;
  environment: DbtEnvironment;
  enableCanonicalLayer: boolean;
  canonicalModelFolderPath: string;
  targetProjectionFolderPath: string;
}

export interface IntegrationSettingsPayload<TSettings> {
  globalDefaults: TSettings;
  projectOverrides: Record<string, Partial<TSettings>>;
}

export interface SettingsProjectOption {
  id: string;
  name: string;
  programName?: string;
}

export const DEFAULT_DATABRICKS_SETTINGS: DatabricksIntegrationSettings = {
  workspaceUrl: '',
  personalAccessToken: '',
  defaultCatalog: '',
  defaultSchema: '',
  metadataSyncEnabled: false,
  metadataSyncFrequency: 'manual',
};

export const DEFAULT_DBT_SETTINGS: DbtIntegrationSettings = {
  dbtProjectRootPath: '',
  dbtProfilesPath: '',
  targetProfileName: '',
  environment: 'dev',
  enableCanonicalLayer: true,
  canonicalModelFolderPath: '/models/canonical',
  targetProjectionFolderPath: '/models/targets',
};
