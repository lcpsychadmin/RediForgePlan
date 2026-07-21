export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      isSuperAdmin?: boolean;
      token?: string;
      tenant?: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        status: 'active' | 'suspended' | 'disabled';
        role?: 'tenant_admin' | 'member' | 'viewer';
      };
    }
  }
}