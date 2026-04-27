import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../lib/jwt.js";

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1];
  if (!token) {
    next();
    return;
  }

  try {
    const payload = await verifyAccessToken(token);
    req.viewerId = payload.userId;
  } catch {
    next();
    return;
  }

  next();
}
