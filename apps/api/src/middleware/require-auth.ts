import type { NextFunction, Request, Response } from "express";

import { resolveBearerUser } from "../lib/auth.js";
import { UnauthorizedError } from "../lib/errors.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1];

  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  const user = await resolveBearerUser(token);
  if (!user) {
    next(new UnauthorizedError());
    return;
  }

  req.user = user;
  next();
}
