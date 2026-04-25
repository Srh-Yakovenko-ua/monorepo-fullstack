import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import * as sessionsRepository from "../db/repositories/sessions.repository.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { verifyRefreshToken } from "../lib/jwt.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";

type OriginCheckResult = { ok: false; reason: string } | { ok: true };

export async function requireRefreshSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method !== "GET") {
    const originCheck = checkOriginOrReferer(req);
    if (!originCheck.ok) {
      next(new ForbiddenError(originCheck.reason));
      return;
    }
  }

  const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  let payload: { deviceId: string; jti: string; userId: string };
  try {
    payload = await verifyRefreshToken(token);
  } catch {
    next(new UnauthorizedError());
    return;
  }

  const session = await sessionsRepository.findByUserAndDevice({
    deviceId: payload.deviceId,
    userId: payload.userId,
  });
  if (!session) {
    next(new UnauthorizedError());
    return;
  }

  if (session.tokenJti !== payload.jti) {
    await sessionsRepository.deleteByUserAndDevice({
      deviceId: payload.deviceId,
      userId: payload.userId,
    });
    next(new UnauthorizedError());
    return;
  }

  req.session = { deviceId: payload.deviceId, userId: payload.userId };
  next();
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
