import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware.js';
import {
  createTenant,
  listTenants,
  updateTenant,
  updateTenantSsoConfig,
} from '../controllers/adminTenant.controller.js';

const router = Router();

router.use(requireAuth, requireSuperAdmin);

router.get('/tenants', listTenants);
router.post('/tenants', createTenant);
router.patch('/tenants/:tenantId', updateTenant);
router.patch('/tenants/:tenantId/sso', updateTenantSsoConfig);

export default router;
