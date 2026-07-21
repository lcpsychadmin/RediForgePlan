import React from 'react';
import { setApiTenantSlug } from '../api/client';

type TenantContextValue = {
  tenantSlug: string;
  availableTenants: string[];
  setTenantSlug: (slug: string) => void;
  switchTenant: (slug: string, targetPath?: string) => void;
};

const TenantContext = React.createContext<TenantContextValue | null>(null);

const TENANT_STORAGE_KEY = 'rediforge.tenant.slug';
const TENANT_LIST_STORAGE_KEY = 'rediforge.tenant.recent';

const normalizeTenantSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');

const parseTenantList = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => normalizeTenantSlug(String(item || ''))).filter(Boolean);
  } catch {
    return [];
  }
};

const getTenantSlugFromHost = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const host = String(window.location.hostname || '').toLowerCase();
  const baseDomain = String(import.meta.env.VITE_APP_BASE_DOMAIN || 'app.rediforge.com')
    .trim()
    .toLowerCase();

  if (!host || !baseDomain || host === baseDomain || !host.endsWith(`.${baseDomain}`)) {
    return '';
  }

  const prefix = host.slice(0, host.length - (`.${baseDomain}`).length);
  return normalizeTenantSlug(prefix.split('.')[0] || '');
};

const getTenantSlugFromPath = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const match = window.location.pathname.match(/^\/t\/([^/]+)(\/.*)?$/i);
  return normalizeTenantSlug(match?.[1] || '');
};

const getInitialTenantSlug = () => {
  if (typeof window === 'undefined') {
    return normalizeTenantSlug(String(import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'default')) || 'default';
  }

  const defaultSlug = normalizeTenantSlug(String(import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'default')) || 'default';
  const fromPath = getTenantSlugFromPath();
  const fromHost = getTenantSlugFromHost();
  const fromStorage = normalizeTenantSlug(window.localStorage.getItem(TENANT_STORAGE_KEY) || '');

  return fromPath || fromHost || fromStorage || defaultSlug;
};

const getConfiguredTenantOptions = () => {
  const raw = String(import.meta.env.VITE_TENANT_OPTIONS || '');
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((item) => normalizeTenantSlug(item))
    .filter(Boolean);
};

const uniqueTenants = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = normalizeTenantSlug(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const isLocalHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantSlug, setTenantSlugState] = React.useState<string>(() => getInitialTenantSlug());
  const [recentTenants, setRecentTenants] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    return parseTenantList(window.localStorage.getItem(TENANT_LIST_STORAGE_KEY));
  });

  React.useEffect(() => {
    setApiTenantSlug(tenantSlug);

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(TENANT_STORAGE_KEY, tenantSlug);
    const nextRecent = uniqueTenants([tenantSlug, ...recentTenants]).slice(0, 8);
    setRecentTenants(nextRecent);
    window.localStorage.setItem(TENANT_LIST_STORAGE_KEY, JSON.stringify(nextRecent));
  }, [tenantSlug]);

  const setTenantSlug = React.useCallback((slug: string) => {
    const normalized = normalizeTenantSlug(slug);
    if (!normalized) {
      return;
    }
    setTenantSlugState(normalized);
  }, []);

  const switchTenant = React.useCallback((slug: string, targetPath?: string) => {
    const normalized = normalizeTenantSlug(slug);
    if (!normalized || typeof window === 'undefined') {
      return;
    }

    const currentPath = targetPath || `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const absolutePath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
    const host = window.location.hostname.toLowerCase();
    const baseDomain = String(import.meta.env.VITE_APP_BASE_DOMAIN || 'app.rediforge.com')
      .trim()
      .toLowerCase();

    if (isLocalHost(host)) {
      window.location.assign(`/t/${normalized}${absolutePath}`);
      return;
    }

    if (baseDomain && (host === baseDomain || host.endsWith(`.${baseDomain}`))) {
      const nextHost = `${normalized}.${baseDomain}`;
      const target = `${window.location.protocol}//${nextHost}${absolutePath}`;
      window.location.assign(target);
      return;
    }

    // Custom domain fallback: stay on host and switch only context/header.
    setTenantSlugState(normalized);
  }, []);

  const availableTenants = React.useMemo(
    () => uniqueTenants([tenantSlug, ...getConfiguredTenantOptions(), ...recentTenants]),
    [tenantSlug, recentTenants]
  );

  const value = React.useMemo(
    () => ({
      tenantSlug,
      availableTenants,
      setTenantSlug,
      switchTenant,
    }),
    [tenantSlug, availableTenants, setTenantSlug, switchTenant]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const context = React.useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
