import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { Injectable } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

import { env } from "../../config/env.js";
import { resolveBearerUser } from "../auth.js";
import { ForbiddenError, UnauthorizedError } from "../errors.js";

const BASIC_PREFIX = "Basic ";
const BEARER_PATTERN = /^Bearer\s+(\S+)\s*$/i;

@Injectable()
export class BasicAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header) throw new UnauthorizedError();

    if (header.startsWith(BASIC_PREFIX)) {
      const ok = verifyBasicCredentials(header.slice(BASIC_PREFIX.length).trim());
      if (!ok) throw new UnauthorizedError();
      return true;
    }

    const bearerToken = header.match(BEARER_PATTERN)?.[1];
    if (!bearerToken) throw new UnauthorizedError();

    const user = await resolveBearerUser(bearerToken);
    if (!user) throw new UnauthorizedError();

    if (user.role !== ROLE.admin && user.role !== ROLE.superAdmin) {
      throw new ForbiddenError();
    }

    request.user = user;
    return true;
  }
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
