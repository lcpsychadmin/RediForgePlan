import { Request, Response, NextFunction } from 'express';
import tenantService from '../services/tenantService.js';

const isGlobalAdminRoute = (path: string) => path.startsWith('/api/admin');
const isAuthRoute = (path: string) => path.startsWith('/auth');

export const resolveTenantContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isGlobalAdminRoute(req.path)) {
      req.tenant = undefined;
      return next();
    }

    const tenant = await tenantService.resolveTenantFromRequest(req);
    if (!tenant) {
      if (isAuthRoute(req.path)) {
        return next();
      }
      return res.status(400).json({ error: 'Unable to resolve an active tenant for this request' });
    }

    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      status: tenant.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const validateTenantMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isSuperAdmin) {
      if (!isGlobalAdminRoute(req.path)) {
        return res.status(403).json({ error: 'Super admins can only access /api/admin routes' });
      }
      return next();
    }

    if (!req.userId) {
      return next();
    }

    if (!req.tenant) {
      if (isAuthRoute(req.path)) {
        return next();
      }
      return res.status(400).json({ error: 'Tenant context is required for user access' });
    }

    if (!req.tenant || !req.userId) {
      return next();
    }

    const isMember = await tenantService.userBelongsToTenant(req.userId, req.tenant.id);
    if (!isMember) {
      return res.status(403).json({ error: 'User is not authorized for this tenant' });
    }

    next();
  } catch (error) {
    next(error);
  }
};