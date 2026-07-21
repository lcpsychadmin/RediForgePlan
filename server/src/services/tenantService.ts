import { Request } from 'express';
import bcrypt from 'bcryptjs';
import { TenantStatus, TenantUserRole } from '@prisma/client';
import db from '../db.js';
import prisma from '../lib/prisma.js';

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: 'active' | 'suspended' | 'disabled';
  created_at: string;
  updated_at: string;
};

export type CreateTenantInput = {
  name: string;
  slug: string;
  primaryAdminEmail: string;
  primaryAdminFirstName?: string;
  primaryAdminLastName?: string;
  plan?: 'free' | 'pro' | 'enterprise';
};

type UpdateTenantInput = {
  name?: string;
  slug?: string;
  status?: 'active' | 'suspended' | 'disabled';
  plan?: 'free' | 'pro' | 'enterprise';
  domain?: string | null;
};

const SALT_ROUNDS = 10;

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
  private mapStatus(status: TenantStatus): 'active' | 'suspended' | 'disabled' {
    if (status === TenantStatus.SUSPENDED) return 'suspended';
    if (status === TenantStatus.DISABLED) return 'disabled';
    return 'active';
  }

  private toTenantRecord(row: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
  }): TenantRecord {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      domain: row.domain,
      status: this.mapStatus(row.status),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  async createTenant(input: CreateTenantInput) {
    const name = String(input.name || '').trim();
    const slug = String(input.slug || '').trim().toLowerCase();
    const email = String(input.primaryAdminEmail || '').trim().toLowerCase();
    const firstName = String(input.primaryAdminFirstName || '').trim() || null;
    const lastName = String(input.primaryAdminLastName || '').trim() || null;

    if (!name || !slug || !email) {
      throw new Error('name, slug, and primaryAdminEmail are required');
    }

    const tenantExists = await prisma.tenant.findUnique({ where: { slug } });
    if (tenantExists) {
      throw new Error('Tenant slug already exists');
    }

    const baseDomain = String(process.env.TENANT_BASE_DOMAIN || 'app.rediforge.com').trim().toLowerCase();
    const loginUrl = `https://${slug}.${baseDomain}`;

    const transactionResult = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          status: TenantStatus.ACTIVE,
          plan: input.plan === 'enterprise' ? 'ENTERPRISE' : input.plan === 'pro' ? 'PRO' : 'FREE',
          ssoEnabled: false,
          ssoProvider: null,
          ssoConfig: null,
        },
      });

      let user = await tx.user.findUnique({
        where: { email },
      });

      if (user) {
        if (user.isSuperAdmin) {
          throw new Error('Super admin users cannot be assigned to a tenant');
        }

        if (user.tenantId && user.tenantId !== tenant.id) {
          throw new Error('User already belongs to another tenant');
        }

        user = await tx.user.update({
          where: { id: user.id },
          data: {
            tenantId: tenant.id,
            tenantRole: TenantUserRole.TENANT_ADMIN,
            firstName: firstName ?? user.firstName,
            lastName: lastName ?? user.lastName,
            legacyRole: user.legacyRole || 'admin',
            isSuperAdmin: false,
          },
        });
      } else {
        const tempPasswordHash = await bcrypt.hash(`rf-${Math.random().toString(36).slice(2)}-temp`, SALT_ROUNDS);
        user = await tx.user.create({
          data: {
            email,
            passwordHash: tempPasswordHash,
            legacyRole: 'admin',
            tenantRole: TenantUserRole.TENANT_ADMIN,
            tenantId: tenant.id,
            isSuperAdmin: false,
            firstName,
            lastName,
          },
        });
      }

      return { tenant, user };
    });

    return {
      tenant: transactionResult.tenant,
      adminUser: transactionResult.user,
      loginUrl,
    };
  }

  async getTenantBySlug(slug: string): Promise<TenantRecord | null> {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return null;
    }
    return this.toTenantRecord(tenant);
  }

  async getTenantByDomain(domain: string): Promise<TenantRecord | null> {
    const tenant = await prisma.tenant.findFirst({
      where: {
        domain: {
          equals: domain,
          mode: 'insensitive',
        },
      },
    });

    if (!tenant) {
      return null;
    }
    return this.toTenantRecord(tenant);
  }

  async listTenants(isSuperAdmin: boolean) {
    if (!isSuperAdmin) {
      throw new Error('Only super admins can list tenants');
    }

    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { tenantRole: TenantUserRole.TENANT_ADMIN },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async updateTenant(tenantId: string, input: UpdateTenantInput) {
    const data: any = {};
    if (input.name !== undefined) data.name = String(input.name || '').trim();
    if (input.slug !== undefined) data.slug = String(input.slug || '').trim().toLowerCase();
    if (input.domain !== undefined) data.domain = input.domain ? String(input.domain).trim().toLowerCase() : null;
    if (input.status !== undefined) {
      data.status =
        input.status === 'suspended'
          ? TenantStatus.SUSPENDED
          : input.status === 'disabled'
            ? TenantStatus.DISABLED
            : TenantStatus.ACTIVE;
    }
    if (input.plan !== undefined) {
      data.plan = input.plan === 'enterprise' ? 'ENTERPRISE' : input.plan === 'pro' ? 'PRO' : 'FREE';
    }

    return prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async updateSsoConfig(tenantId: string, ssoConfig: { enabled: boolean; provider?: string; config?: any }) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ssoEnabled: !!ssoConfig?.enabled,
        ssoProvider: ssoConfig?.provider ? String(ssoConfig.provider).trim() : null,
        ssoConfig: ssoConfig?.config || null,
      },
    });
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, isSuperAdmin: true },
    });

    if (!user || user.isSuperAdmin) {
      return false;
    }

    return user.tenantId === tenantId;
  }
}

export default new TenantService();