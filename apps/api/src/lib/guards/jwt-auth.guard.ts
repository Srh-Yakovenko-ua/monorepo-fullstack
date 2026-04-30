import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { Injectable } from "@nestjs/common";

import { resolveBearerUser } from "../auth.js";
import { UnauthorizedError } from "../errors.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1];
    if (!token) throw new UnauthorizedError();

    const user = await resolveBearerUser(token);
    if (!user) throw new UnauthorizedError();

    request.user = user;
    return true;
  }
}
