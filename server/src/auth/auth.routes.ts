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
