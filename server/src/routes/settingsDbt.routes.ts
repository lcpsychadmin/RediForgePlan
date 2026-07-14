import { Router, Request, Response, NextFunction } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { formatSingleResponse } from '../utils/responseFormatter.js';
import dbtService from '../services/dbtService.js';
import {
  DEFAULT_DBT_SETTINGS,
  type DbtIntegrationSettings,
} from '../constants/integrationSettings.js';

const router = Router();
const preferenceTable = 'global_hierarchy_preferences';

const SETTINGS_KEY = 'dbtIntegrationSettings';
const OVERRIDES_KEY = 'dbtProjectOverrides';

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
      ...DEFAULT_DBT_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
    };
    const projectOverrides = (state[OVERRIDES_KEY] || {}) as Record<string, Partial<DbtIntegrationSettings>>;

    res.json(formatSingleResponse({ globalDefaults, projectOverrides }));
  } catch (error) {
    next(error);
  }
});

router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const globalDefaults = {
      ...DEFAULT_DBT_SETTINGS,
      ...(req.body?.globalDefaults || {}),
    };
    const projectOverrides = (req.body?.projectOverrides || {}) as Record<string, Partial<DbtIntegrationSettings>>;

    await writeSettingsState({
      [SETTINGS_KEY]: globalDefaults,
      [OVERRIDES_KEY]: projectOverrides,
    });

    res.json(formatSingleResponse({ globalDefaults, projectOverrides }));
  } catch (error) {
    next(error);
  }
});

router.post('/validate-paths', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = {
      ...DEFAULT_DBT_SETTINGS,
      ...(req.body?.settings || {}),
    } as DbtIntegrationSettings;

    const result = await dbtService.validatePaths(settings);
    res.json(formatSingleResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get('/models', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await readSettingsState();
    const settings = {
      ...DEFAULT_DBT_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
      ...(req.query?.dbtProjectRootPath ? { dbtProjectRootPath: String(req.query.dbtProjectRootPath) } : {}),
    } as DbtIntegrationSettings;

    const models = await dbtService.listModels(settings);
    res.json(formatSingleResponse({ models }));
  } catch (error) {
    next(error);
  }
});

router.post('/run-command', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = {
      ...DEFAULT_DBT_SETTINGS,
      ...(req.body?.settings || {}),
    } as DbtIntegrationSettings;

    const command = String(req.body?.command || '').trim();
    const result = await dbtService.runDbtCommand(settings, command);
    res.json(formatSingleResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get('/manifest', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await readSettingsState();
    const settings = {
      ...DEFAULT_DBT_SETTINGS,
      ...(state[SETTINGS_KEY] || {}),
      ...(req.query?.dbtProjectRootPath ? { dbtProjectRootPath: String(req.query.dbtProjectRootPath) } : {}),
    } as DbtIntegrationSettings;

    const manifest = await dbtService.getDbtManifest(settings);
    res.json(formatSingleResponse(manifest));
  } catch (error) {
    next(error);
  }
});

export default router;
