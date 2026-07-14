import { Router, Request, Response, NextFunction } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import databricksService from '../services/databricksService.js';
import {
  DEFAULT_DATABRICKS_SETTINGS,
  type DatabricksIntegrationSettings,
} from '../constants/integrationSettings.js';

const router = Router();
const preferenceTable = 'global_hierarchy_preferences';

const SETTINGS_KEY = 'databricksIntegrationSettings';
const OVERRIDES_KEY = 'databricksProjectOverrides';

const readSettingsState = async () => {
  const result = await db.query(
    `SELECT hierarchy_state FROM ${preferenceTable} WHERE id = 1`
  );
  return (result.rows[0]?.hierarchy_state || {}) as Record<string, any>;
};

const writeSettingsState = async (patch: Record<string, unknown>) => {
  await db.query(
    `INSERT INTO ${preferenceTable} (id, hierarchy_state, updated_at)
     VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (id)
     DO UPDATE SET hierarchy_state = COALESCE(${preferenceTable}.hierarchy_state, '{}'::jsonb) || $1::jsonb,
                   updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(patch)]
  );
};

router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await readSettingsState();
    const globalDefaults = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
    };
    const projectOverrides = (state[OVERRIDES_KEY] || {}) as Record<string, Partial<DatabricksIntegrationSettings>>;

    res.json(formatSingleResponse({ globalDefaults, projectOverrides }));
  } catch (error) {
    next(error);
  }
});

router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const globalDefaults = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(req.body?.globalDefaults || {}),
    };
    const projectOverrides = (req.body?.projectOverrides || {}) as Record<string, Partial<DatabricksIntegrationSettings>>;

    await writeSettingsState({
      [SETTINGS_KEY]: globalDefaults,
      [OVERRIDES_KEY]: projectOverrides,
    });

    res.json(formatSingleResponse({ globalDefaults, projectOverrides }));
  } catch (error) {
    next(error);
  }
});

router.post('/test-connection', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(req.body?.settings || {}),
    } as DatabricksIntegrationSettings;

    const result = await databricksService.testConnection(settings);
    res.json(formatSingleResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get('/catalogs', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await readSettingsState();
    const settings = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
      ...(req.query?.serverHostname ? { serverHostname: String(req.query.serverHostname) } : {}),
      ...(req.query?.httpPath ? { httpPath: String(req.query.httpPath) } : {}),
      ...(req.query?.workspaceUrl ? { workspaceUrl: String(req.query.workspaceUrl) } : {}),
      ...(req.query?.token ? { personalAccessToken: String(req.query.token) } : {}),
    } as DatabricksIntegrationSettings;

    const catalogs = await databricksService.listCatalogs(settings);
    res.json(formatSingleResponse({ catalogs }));
  } catch (error) {
    next(error);
  }
});

router.get('/schemas', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await readSettingsState();
    const settings = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
      ...(req.query?.serverHostname ? { serverHostname: String(req.query.serverHostname) } : {}),
      ...(req.query?.httpPath ? { httpPath: String(req.query.httpPath) } : {}),
      ...(req.query?.workspaceUrl ? { workspaceUrl: String(req.query.workspaceUrl) } : {}),
      ...(req.query?.token ? { personalAccessToken: String(req.query.token) } : {}),
      ...(req.query?.catalog ? { defaultCatalog: String(req.query.catalog) } : {}),
    } as DatabricksIntegrationSettings;

    const schemas = await databricksService.listSchemas(settings, String(req.query?.catalog || settings.defaultCatalog || ''));
    res.json(formatSingleResponse({ schemas }));
  } catch (error) {
    next(error);
  }
});

router.post('/metadata/fetch', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = {
      ...DEFAULT_DATABRICKS_SETTINGS,
      ...(req.body?.settings || {}),
    } as DatabricksIntegrationSettings;

    const metadata = await databricksService.fetchMetadata(settings);
    res.json(formatSingleResponse(metadata));
  } catch (error) {
    next(error);
  }
});

export default router;
