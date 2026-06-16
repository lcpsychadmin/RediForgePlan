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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If MFA is disabled, bypass MFA and issue token directly
    if (!user.mfa_enabled) {
      const token = createJWT(user.id, user.email, user.role);
      await storeSession(user.id, token.token);
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
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'User ID and TOTP token are required' });
    }

    // Get user and their MFA secret
    const user = await getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (!user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled for this user' });
    }

    // Verify the TOTP token (will handle decryption internally)
    const verified = await verifyTOTPFromUserId(userId, token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired MFA token' });
    }

    // Create JWT token
    const { token: jwtToken } = createJWT(user.id, user.email, user.role);

    // Store session
    await storeSession(user.id, jwtToken);

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
    const userId = (req as any).userId;

    const user = await getUserById(userId);
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
    const adminId = (req as any).userId;

    // Verify requesting user is admin
    const admin = await getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // Check if user already exists
    if (await userExists(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const newUser = await createUser(email, password, role);

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await getUserByEmail(email);
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
    const userId = (req as any).userId;

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
    await enableUserMFA(userId, secret);

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
export const verifyTOTPFromUserId = async (userId: string, token: string): Promise<boolean> => {
  try {
    const { getUserMFASecret } = await import('./auth.service.js');
    const secret = await getUserMFASecret(userId);

    if (!secret) {
      return false;
    }

    return verifyTOTPToken(token, secret);
  } catch (error) {
    return false;
  }
};
