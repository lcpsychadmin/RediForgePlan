// server/src/routes/api.routes.ts
// Main API router - wires all domain routes together

import { Router } from 'express';
import applicationsRouter from './applications.routes.js';
import programsRouter from './programs.routes.js';
import mockCyclesRouter from './mockCycles.routes.js';
import projectsRouter from './projects.routes.js';
import globalObjectsRouter from './globalObjects.routes.js';
import mappingRouter from './mapping.routes.js';
import projectObjectsRouter from './projectObjects.routes.js';
import tasksRouter from './tasks.routes.js';
import scheduleRouter from './schedule.routes.js';
import prioritiesRouter from './priorities.routes.js';
import auditRouter from './audit.routes.js';
import peopleRouter from './people.routes.js';
import commentsRouter from './comments.routes.js';
import hierarchyPreferencesRouter from './hierarchyPreferences.routes.js';
import settingsDatabricksRouter from './settingsDatabricks.routes.js';
import settingsDbtRouter from './settingsDbt.routes.js';
import cdmRouter from './cdm.routes.js';
import aiRouter from './ai.routes.js';
import objectInventoryAiRouter from './objectInventoryAi.routes.js';
import objectModelingAiRouter from './objectModelingAi.routes.js';
import adminRouter from './admin.routes.js';
import validationRouter from '../validation/validation.routes.js';
import issuesRouter from '../issues/issues.routes.js';
import defectsRouter from '../defects/defects.routes.js';
import reportingRouter from '../reporting/reporting.routes.js';

const apiRouter = Router();

// Program hierarchy routes
apiRouter.use('/programs', programsRouter);
apiRouter.use('/mock-cycles', mockCyclesRouter);
apiRouter.use('/projects', projectsRouter);

// Object inventory routes
apiRouter.use('/global-objects', globalObjectsRouter);
apiRouter.use('/objects', globalObjectsRouter);
apiRouter.use('/project-objects', projectObjectsRouter);

// Task management routes
apiRouter.use('/tasks', tasksRouter);

// Validation, issue tracking, and defects routes
apiRouter.use('/', validationRouter);
apiRouter.use('/', issuesRouter);
apiRouter.use('/', defectsRouter);

// Schedule and priorities routes
apiRouter.use('/schedule', scheduleRouter);
apiRouter.use('/priorities', prioritiesRouter);

// Audit routes
apiRouter.use('/audit', auditRouter);
apiRouter.use('/people', peopleRouter);
apiRouter.use('/applications', applicationsRouter);
apiRouter.use('/mapping', mappingRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/reporting', reportingRouter);
apiRouter.use('/hierarchy-preferences', hierarchyPreferencesRouter);
apiRouter.use('/settings/databricks', settingsDatabricksRouter);
apiRouter.use('/settings/dbt', settingsDbtRouter);
apiRouter.use('/cdm', cdmRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/ai/object-inventory', objectInventoryAiRouter);
apiRouter.use('/', objectModelingAiRouter);
apiRouter.use('/admin', adminRouter);

export default apiRouter;
