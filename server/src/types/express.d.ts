export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      token?: string;
      tenant?: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        status: 'active' | 'suspended' | 'disabled';
      };
    }
  }
}