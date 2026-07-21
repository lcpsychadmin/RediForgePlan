import { Request, Response, NextFunction } from 'express';
import tenantService from '../services/tenantService.js';

export const resolveTenantContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await tenantService.resolveTenantFromRequest(req);
    if (!tenant) {
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