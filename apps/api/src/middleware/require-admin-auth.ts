import type { NextFunction, Request, Response } from "express";

import { ROLE } from "@app/shared";
import { timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import { resolveBearerUser } from "../lib/auth.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

const BASIC_PREFIX = "Basic ";
const BEARER_PATTERN = /^Bearer\s+(\S+)\s*$/i;

export async function requireAdminAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header) {
    next(new UnauthorizedError());
    return;
  }

  if (header.startsWith(BASIC_PREFIX)) {
    const ok = verifyBasicCredentials(header.slice(BASIC_PREFIX.length).trim());
    if (!ok) {
      next(new UnauthorizedError());
      return;
    }
    next();
    return;
  }

  const bearerToken = header.match(BEARER_PATTERN)?.[1];
  if (!bearerToken) {
    next(new UnauthorizedError());
    return;
  }

  const user = await resolveBearerUser(bearerToken);
  if (!user) {
    next(new UnauthorizedError());
    return;
  }

  if (user.role !== ROLE.admin && user.role !== ROLE.superAdmin) {
    next(new ForbiddenError());
    return;
  }

  req.user = user;
  next();
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function verifyBasicCredentials(encoded: string): boolean {
  if (encoded.length === 0) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const providedUser = decoded.slice(0, separator);
  const providedPassword = decoded.slice(separator + 1);

  return (
    safeEqual(providedUser, env.basicAuthUser) && safeEqual(providedPassword, env.basicAuthPassword)
  );
}
