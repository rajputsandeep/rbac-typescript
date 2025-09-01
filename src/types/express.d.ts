declare global {
  namespace Express {
    interface UserPayload {
      sub: string;       // userId
      email: string;
      role: string;
      tenantId?: string | null;
    }

    interface Request {
      user?: UserPayload;
      tenantId?: string | null;
    }
  }
}

export {};
