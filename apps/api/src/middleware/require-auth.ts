import type { NextFunction, Request, Response } from "express";

import * as usersRepository from "../db/repositories/users.repository.js";
import { UnauthorizedError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new UnauthorizedError());
    return;
  }

  const token = authHeader.slice(7);

  let userId: string;
  try {
    const payload = await verifyAccessToken(token);
    userId = payload.userId;
  } catch {
    next(new UnauthorizedError());
    return;
  }

  const user = await usersRepository.findById(userId);
  if (!user) {
    next(new UnauthorizedError());
    return;
  }

  req.user = {
    email: user.email,
    login: user.login,
    userId: user._id.toHexString(),
  };

  next();
}
