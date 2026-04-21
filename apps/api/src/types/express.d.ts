declare global {
  namespace Express {
    interface Request {
      requestId: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
