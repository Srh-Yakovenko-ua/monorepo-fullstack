declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { email: string; login: string; userId: string };
      validatedQuery?: unknown;
    }
  }
}

export {};
