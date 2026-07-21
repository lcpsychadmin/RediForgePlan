import { Request, Response, NextFunction } from 'express';
import tenantService from '../services/tenantService.js';

export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, primaryAdminEmail, primaryAdminFirstName, primaryAdminLastName, plan } = req.body || {};

    const result = await tenantService.createTenant({
      name,
      slug,
      primaryAdminEmail,
      primaryAdminFirstName,
      primaryAdminLastName,
      plan,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await tenantService.listTenants(!!req.isSuperAdmin);
    res.json({ success: true, data: tenants, total: tenants.length });
  } catch (error) {
    next(error);
  }
};

export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.tenantId, req.body || {});
    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

export const updateTenantSsoConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await tenantService.updateSsoConfig(req.params.tenantId, req.body || {});
    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};
