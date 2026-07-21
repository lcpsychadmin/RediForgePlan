import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import authRoutes from './auth/auth.routes.js';
import apiRoutes from './routes/api.routes.js';
import { requestLogger } from './middleware/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { optionalAuth } from './middleware/authMiddleware.js';
import { resolveTenantContext, validateTenantMembership } from './middleware/tenantContextMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Resolve tenant early for both auth and API traffic.
app.use(resolveTenantContext);
app.use(optionalAuth);
app.use(validateTenantMembership);

// API Routes (new planning API)
app.use('/api', apiRoutes);

// Auth Routes (existing)
app.use('/auth', authRoutes);

// Legacy routes (if any)
app.use('/api/legacy', routes);

// Serve static files from React build in production
if (NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // React router fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

export default app;
