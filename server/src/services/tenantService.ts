import { Request } from 'express';
import db from '../db.js';

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'active' | 'suspended' | 'disabled';
  created_at: string;
  updated_at: string;
};

const normalizeHost = (input?: string) => {
  const raw = String(input || '').split(',')[0].trim().toLowerCase();
  if (!raw) {
    return '';
  }
  return raw.split(':')[0];
};

const getTenantSlugFromHost = (host: string, baseDomain: string) => {
  if (!host || !baseDomain) {
    return '';
  }

  const normalizedBase = baseDomain.toLowerCase();
  if (host === normalizedBase) {
    return '';
  }

  const suffix = `.${normalizedBase}`;
  if (!host.endsWith(suffix)) {
    return '';
  }

  const prefix = host.slice(0, host.length - suffix.length);
  return String(prefix || '').split('.')[0].trim().toLowerCase();
};

class TenantService {
  async getTenantBySlug(slug: string): Promise<TenantRecord | null> {
    const result = await db.query(
      `SELECT id, name, slug, domain, status, created_at, updated_at
       FROM organizations
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    return (result.rows[0] as TenantRecord) || null;
  }

  async getTenantByDomain(domain: string): Promise<TenantRecord | null> {
    const result = await db.query(
      `SELECT id, name, slug, domain, status, created_at, updated_at
       FROM organizations
       WHERE lower(domain) = lower($1)
       LIMIT 1`,
      [domain]
    );

    return (result.rows[0] as TenantRecord) || null;
  }

  async resolveTenantFromRequest(req: Request): Promise<TenantRecord | null> {
    const host = normalizeHost(String(req.headers['x-forwarded-host'] || req.headers.host || ''));
    const baseDomain = String(process.env.TENANT_BASE_DOMAIN || 'app.rediforge.com').trim().toLowerCase();
    const fallbackSlug = String(process.env.DEFAULT_TENANT_SLUG || 'default').trim().toLowerCase();
    const headerSlug = String(req.headers['x-tenant-slug'] || req.query.tenantSlug || '')
      .trim()
      .toLowerCase();

    let tenant: TenantRecord | null = null;
    const slugFromHost = getTenantSlugFromHost(host, baseDomain);

    if (slugFromHost) {
      tenant = await this.getTenantBySlug(slugFromHost);
    } else if (host && host !== baseDomain) {
      tenant = await this.getTenantByDomain(host);
    }

    if (!tenant && headerSlug) {
      tenant = await this.getTenantBySlug(headerSlug);
    }

    if (!tenant && (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost'))) {
      tenant = await this.getTenantBySlug(fallbackSlug);
    }

    if (!tenant || tenant.status !== 'active') {
      return null;
    }

    return tenant;
  }

  async userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1
       FROM users
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [userId, tenantId]
    );

    return result.rows.length > 0;
  }
}

export default new TenantService();