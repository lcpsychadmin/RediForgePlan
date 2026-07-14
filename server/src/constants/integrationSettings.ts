export type MetadataSyncFrequency = 'manual' | 'daily' | 'weekly';
export type DbtEnvironment = 'dev' | 'test' | 'prod';

export interface DatabricksIntegrationSettings {
  serverHostname: string;
  httpPath: string;
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

export const DEFAULT_DATABRICKS_SETTINGS: DatabricksIntegrationSettings = {
  serverHostname: '',
  httpPath: '',
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
  canonicalModelFolderPath: '/models/common-data-model',
  targetProjectionFolderPath: '/models/targets',
};
