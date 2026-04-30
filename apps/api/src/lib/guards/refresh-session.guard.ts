import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { Injectable } from "@nestjs/common";

import { env } from "../../config/env.js";
import * as sessionsRepository from "../../db/repositories/sessions.repository.js";
import { ForbiddenError, UnauthorizedError } from "../errors.js";
import { verifyRefreshToken } from "../jwt.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";

type OriginCheckResult = { ok: false; reason: string } | { ok: true };

@Injectable()
export class RefreshSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.method !== "GET") {
      const originCheck = checkOriginOrReferer(request);
      if (!originCheck.ok) throw new ForbiddenError(originCheck.reason);
    }

    const token = request.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedError();

    let payload: { deviceId: string; jti: string; userId: string };
    try {
      payload = await verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError();
    }

    const session = await sessionsRepository.findByUserAndDevice({
      deviceId: payload.deviceId,
      userId: payload.userId,
    });
    if (!session) throw new UnauthorizedError();

    if (session.tokenJti !== payload.jti) {
      await sessionsRepository.deleteByUserAndDevice({
        deviceId: payload.deviceId,
        userId: payload.userId,
      });
      throw new UnauthorizedError();
    }

    request.session = { deviceId: payload.deviceId, userId: payload.userId };
    return true;
  }
}

function checkOriginOrReferer(req: Request): OriginCheckResult {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) {
    if (env.corsOrigins.includes(origin)) return { ok: true };
    return { ok: false, reason: "Invalid Origin" };
  }

  const referer = req.headers.referer;
  if (typeof referer === "string" && referer.length > 0) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (env.corsOrigins.includes(refererOrigin)) return { ok: true };
      return { ok: false, reason: "Invalid Origin" };
    } catch {
      return { ok: false, reason: "Invalid Origin" };
    }
  }

  return { ok: false, reason: "Missing Origin/Referer" };
}
