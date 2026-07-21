import { Request, Response, NextFunction } from 'express';
import { verifyJWT, verifySession, getUserById } from '../auth/auth.service.js';

/**
 * Require authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT signature
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (req.tenant && decoded.tenantId && decoded.tenantId !== req.tenant.id) {
      return res.status(403).json({ error: 'Token tenant does not match request tenant' });
    }

    // Verify session exists in database
    const sessionValid = await verifySession(token, req.tenant?.id);
    if (!sessionValid) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = await getUserById(decoded.userId, req.tenant?.id);
    if (!user) {
      return res.status(403).json({ error: 'User is not authorized for this tenant' });
    }

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-based access control middleware
 * @param allowedRoles - Array of roles allowed to access route
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional auth middleware - attaches user if present, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      const decoded = verifyJWT(token);
      if (decoded) {
        if (req.tenant && decoded.tenantId && decoded.tenantId !== req.tenant.id) {
          return next();
        }

        const sessionValid = await verifySession(token, req.tenant?.id);
        if (sessionValid) {
          req.userId = decoded.userId;
          req.userEmail = decoded.email;
          req.userRole = decoded.role;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
