import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { Injectable } from "@nestjs/common";

import { verifyAccessToken } from "../jwt.js";

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1];
    if (!token) return true;

    try {
      const payload = await verifyAccessToken(token);
      request.viewerId = payload.userId;
    } catch {
      return true;
    }

    return true;
  }
}
