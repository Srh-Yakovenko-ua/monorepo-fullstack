import type { UserRole } from "@app/shared";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { email: string; login: string; role: UserRole; userId: string };
      validatedQuery?: unknown;
    }
  }
}

export {};
