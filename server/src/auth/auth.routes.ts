import express from 'express';
import {
  login,
  verifyMFA,
  logout,
  getCurrentUser,
  createNewUser,
  setupMFA,
  enableMFA,
} from './auth.controller.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Public routes
 */
router.post('/login', login);
router.post('/mfa/verify', verifyMFA);
router.post('/mfa/setup', setupMFA);

/**
 * Seed route (development only) - creates initial admin user if no users exist
 */
router.post('/seed', async (req, res) => {
  try {
    const { query } = require('../db.js');
    
    // Check if any users exist
    const result = await query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(result.rows[0].count);
    
    if (userCount > 0) {
      return res.status(400).json({ error: 'Users already exist - seed aborted' });
    }
    
    // Create default admin user - delete and recreate
    const { hashPassword } = await import('./auth.service.js');
    const hashedPassword = await hashPassword('password');
    
    // Insert admin user
    await query(
      `INSERT INTO users (id, email, password_hash, role, mfa_enabled) 
       VALUES (gen_random_uuid(), $1, $2, $3, false)`,
      ['admin@rediforge.com', hashedPassword, 'admin']
    );
    
    // Insert analyst user
    const hashedPassword2 = await hashPassword('password');
    await query(
      `INSERT INTO users (id, email, password_hash, role, mfa_enabled) 
       VALUES (gen_random_uuid(), $1, $2, $3, false)`,
      ['analyst@rediforge.com', hashedPassword2, 'analyst']
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
    res.status(500).json({ error: error.message });
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

export default router;
