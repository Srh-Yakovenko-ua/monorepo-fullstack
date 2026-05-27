import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { Injectable } from "@nestjs/common";

import { env } from "../../config/env.js";
import { AuthHelper } from "../auth-helper.js";
import { ForbiddenError, UnauthorizedError } from "../exceptions/errors.js";

const BASIC_SCHEME_REGEX = /^Basic\s+(\S+)\s*$/i;
const BEARER_SCHEME_REGEX = /^Bearer\s+(\S+)\s*$/i;

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authHelper: AuthHelper) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header) throw new UnauthorizedError();

    const basicToken = header.match(BASIC_SCHEME_REGEX)?.[1];
    if (basicToken !== undefined) {
      const credentials = decodeBasicCredentials(basicToken);
      if (!credentials) throw new UnauthorizedError();
      if (
        credentials.login !== env.basicAuthLogin ||
        credentials.password !== env.basicAuthPassword
      ) {
        throw new UnauthorizedError();
      }
      return true;
    }

    const bearerToken = header.match(BEARER_SCHEME_REGEX)?.[1];
    if (bearerToken === undefined) throw new UnauthorizedError();

    const user = await this.authHelper.resolveBearerUser(bearerToken);
    if (!user) throw new UnauthorizedError();
    if (user.role !== ROLE.superAdmin) throw new ForbiddenError();

    request.user = user;
    return true;
  }
}

function decodeBasicCredentials(token: string): null | { login: string; password: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return null;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) return null;
  return {
    login: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}
