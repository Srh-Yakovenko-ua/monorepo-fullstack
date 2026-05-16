import type { UserRole } from "@app/shared";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      session?: { deviceId: string; userId: number };
      user?: { email: string; login: string; role: UserRole; userId: number };
      validatedQuery?: unknown;
      viewerId?: number;
    }
  }
}

export {};
