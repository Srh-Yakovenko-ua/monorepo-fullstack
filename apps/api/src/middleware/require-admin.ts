import type { NextFunction, Request, Response } from "express";

import { ROLE } from "@app/shared";

import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  if (req.user.role !== ROLE.admin && req.user.role !== ROLE.superAdmin) {
    next(new ForbiddenError());
    return;
  }
  next();
}
