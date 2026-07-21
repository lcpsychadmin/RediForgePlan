import express from 'express';
import {
  login,
  verifyMFA,
  logout,
  getCurrentUser,
  createNewUser,
  setupMFA,
  enableMFA,
  autoLoginAdmin,
  buildAccessLogin,
} from './auth.controller.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { query } from '../db.js';
import { hashPassword, listUsersForAssignment } from './auth.service.js';

const router = express.Router();

/**
 * Public routes
 */
router.post('/login', login);
router.post('/auto-login', autoLoginAdmin);
router.post('/build-access', buildAccessLogin);
router.post('/mfa/verify', verifyMFA);
router.post('/mfa/setup', setupMFA);

/**
 * Seed route (development only) - creates initial admin user if no users exist
 */
router.post('/seed', async (req, res) => {
  try {
    const tenantSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim().toLowerCase();

    const tenantResult = await query(
      `INSERT INTO organizations (name, slug, status)
       VALUES ('Default Organization', $1, 'active')
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id`,
      [tenantSlug]
    );
    const tenantId = tenantResult.rows[0].id;

    // Check if any users exist
    const result = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
    const userCount = parseInt(result.rows[0].count);
    
    if (userCount > 0) {
      return res.status(400).json({ error: 'Users already exist - seed aborted' });
    }
    
    // Create default admin user
    const hashedPassword = await hashPassword('password');
    
    // Insert admin user
    await query(
      `INSERT INTO users (id, email, password_hash, role, mfa_enabled, tenant_id)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $4)`,
      ['admin@rediforge.com', hashedPassword, 'admin', tenantId]
    );
    
    // Insert analyst user
    const hashedPassword2 = await hashPassword('password');
    await query(
      `INSERT INTO users (id, email, password_hash, role, mfa_enabled, tenant_id)
       VALUES (gen_random_uuid(), $1, $2, $3, false, $4)`,
      ['analyst@rediforge.com', hashedPassword2, 'analyst', tenantId]
    );
    
    res.json({ 
      success: true, 
      message: 'Seed users created',
      users: [
        { email: 'admin@rediforge.com', password: 'password', role: 'admin' },
        { email: 'analyst@rediforge.com', password: 'password', role: 'analyst' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: (error as any).message });
  }
});

/**
 * Protected routes (require authentication)
 */
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getCurrentUser);
router.post('/mfa/enable', requireAuth, enableMFA);

/**
 * Admin-only routes
 */
router.post('/admin/create-user', requireAuth, requireRole('admin'), createNewUser);

router.get('/admin/users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const tenantId = _req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    const users = await listUsersForAssignment(tenantId);
    res.json({ data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ error: (error as any).message || 'Failed to fetch users' });
  }
});

export default router;
