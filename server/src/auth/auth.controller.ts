import { Request, Response, NextFunction } from 'express';
import {
  getUserByEmail,
  comparePassword,
  createJWT,
  storeSession,
  verifySession,
  invalidateSession,
  createUser,
  getUserById,
  userExists,
} from './auth.service.js';
import {
  generateMFASecret,
  generateQRCodeDataUrl,
  verifyTOTPToken,
  encryptMFASecret,
} from './mfa.service.js';

/**
 * Step 1: Login - Validate email and password
 * Returns: mfaRequired flag and temporary session token
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database
    const user = await getUserByEmail(email, tenantId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!tenantId && !user.is_super_admin) {
      return res.status(400).json({ error: 'Tenant context is required for non-super-admin users' });
    }

    if (tenantId && user.is_super_admin) {
      return res.status(403).json({ error: 'Super admin users must authenticate in global admin context' });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If MFA is disabled, bypass MFA and issue token directly
    if (!user.mfa_enabled) {
      const token = createJWT(user.id, user.email, user.role, tenantId || user.tenant_id || null, !!user.is_super_admin);
      await storeSession(user.id, token.token, tenantId || user.tenant_id || null);
      return res.json({
        mfaRequired: false,
        token: token.token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    }

    // Return MFA challenge required
    res.json({
      mfaRequired: true,
      email: user.email,
      userId: user.id,
      message: 'Enter your MFA code from your authenticator app',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Verify MFA token and issue JWT
 */
export const verifyMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id;

    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'User ID and TOTP token are required' });
    }

    // Get user and their MFA secret
    const user = await getUserById(userId, tenantId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (!tenantId && !user.is_super_admin) {
      return res.status(400).json({ error: 'Tenant context is required for non-super-admin users' });
    }

    if (tenantId && user.is_super_admin) {
      return res.status(403).json({ error: 'Super admin users must authenticate in global admin context' });
    }

    if (!user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled for this user' });
    }

    // Verify the TOTP token (will handle decryption internally)
    const verified = await verifyTOTPFromUserId(userId, token, tenantId);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired MFA token' });
    }

    // Create JWT token
    const { token: jwtToken } = createJWT(
      user.id,
      user.email,
      user.role,
      tenantId || user.tenant_id || null,
      !!user.is_super_admin
    );

    // Store session
    await storeSession(user.id, jwtToken, tenantId || user.tenant_id || null);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout - Invalidate JWT session
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      await invalidateSession(token);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const tenantId = req.tenant?.id;

    const user = await getUserById(userId, tenantId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create new user and return MFA setup QR code
 */
export const createNewUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    const adminId = req.userId;
    const tenantId = req.tenant?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    // Verify requesting user is admin
    const admin = await getUserById(adminId, tenantId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // Check if user already exists
    if (await userExists(email, tenantId)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const newUser = await createUser(email, password, role, tenantId);

    // Generate MFA secret
    const { base32, qrCodeUrl } = generateMFASecret(email);

    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrCodeUrl);

    // Store encrypted MFA secret temporarily
    const encryptedSecret = encryptMFASecret(base32);

    res.json({
      user: newUser,
      mfa: {
        secret: base32,
        qrCodeUrl: qrCodeUrl,
        qrCodeImage: qrCodeDataUrl, // Data URL for display
      },
      instructions: 'User must scan QR code and verify TOTP code to enable MFA',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Setup MFA for current user (as admin provides QR code)
 */
export const setupMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getUserByEmail(email, tenantId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate MFA secret
    const { base32, qrCodeUrl } = generateMFASecret(email);

    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrCodeUrl);

    res.json({
      secret: base32,
      qrCodeUrl: qrCodeUrl,
      qrCodeImage: qrCodeDataUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify and enable MFA for a user
 */
export const enableMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret, token } = req.body;
    const userId = req.userId;
    const tenantId = req.tenant?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    if (!secret || !token) {
      return res.status(400).json({ error: 'Secret and TOTP token are required' });
    }

    // Verify TOTP token against the secret
    const verified = verifyTOTPToken(token, secret);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid TOTP token' });
    }

    // Store encrypted MFA secret and enable MFA
    const { enableUserMFA } = await import('./auth.service.js');
    await enableUserMFA(userId, secret, tenantId);

    res.json({
      success: true,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Verify TOTP token for a user by ID
 */
export const verifyTOTPFromUserId = async (
  userId: string,
  token: string,
  tenantId?: string
): Promise<boolean> => {
  try {
    const { getUserMFASecret } = await import('./auth.service.js');
    const secret = await getUserMFASecret(userId, tenantId);

    if (!secret) {
      return false;
    }

    return verifyTOTPToken(token, secret);
  } catch (error) {
    return false;
  }
};

/**
 * Optional testing helper: auto-login as configured admin user.
 * Disabled by default; enable explicitly via env var.
 */
export const autoLoginAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    const enabled = String(process.env.AUTO_LOGIN_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      return res.status(404).json({ error: 'Not found' });
    }

    const adminEmail = String(process.env.AUTO_LOGIN_ADMIN_EMAIL || 'admin@rediforge.com').trim().toLowerCase();
    if (!adminEmail) {
      return res.status(500).json({ error: 'AUTO_LOGIN_ADMIN_EMAIL is not configured' });
    }

    const user = await getUserByEmail(adminEmail, tenantId);
    if (!user) {
      return res.status(404).json({ error: 'Auto-login admin user not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Configured auto-login user is not an admin' });
    }

    const token = createJWT(user.id, user.email, user.role, tenantId);
    await storeSession(user.id, token.token, tenantId);

    return res.json({
      mfaRequired: false,
      token: token.token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: !!user.mfa_enabled,
      },
      autoLogin: true,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optional build helper: login with a shared build access key.
 * Disabled by default; enable explicitly via env vars.
 */
export const buildAccessLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required' });
    }

    const enabled = String(process.env.BUILD_ACCESS_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      return res.status(404).json({ error: 'Not found' });
    }

    const expectedKey = String(process.env.BUILD_ACCESS_KEY || '').trim();
    if (!expectedKey) {
      return res.status(500).json({ error: 'BUILD_ACCESS_KEY is not configured' });
    }

    const providedKey = String(req.body?.key || req.headers['x-build-access-key'] || '').trim();
    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid build access key' });
    }

    const loginEmail = String(process.env.BUILD_ACCESS_EMAIL || process.env.AUTO_LOGIN_ADMIN_EMAIL || 'admin@rediforge.com')
      .trim()
      .toLowerCase();

    const user = await getUserByEmail(loginEmail, tenantId);
    if (!user) {
      return res.status(404).json({ error: 'Build access user not found' });
    }

    const token = createJWT(user.id, user.email, user.role, tenantId);
    await storeSession(user.id, token.token, tenantId);

    return res.json({
      mfaRequired: false,
      token: token.token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: !!user.mfa_enabled,
      },
      buildAccess: true,
    });
  } catch (error) {
    next(error);
  }
};
