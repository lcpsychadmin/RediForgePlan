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

    // Verify session exists in database
    const sessionValid = await verifySession(token);
    if (!sessionValid) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Attach user info to request
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    (req as any).userRole = decoded.role;
    (req as any).token = token;

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
    const userRole = (req as any).userRole;

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
        const sessionValid = await verifySession(token);
        if (sessionValid) {
          (req as any).userId = decoded.userId;
          (req as any).userEmail = decoded.email;
          (req as any).userRole = decoded.role;
          (req as any).token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};
