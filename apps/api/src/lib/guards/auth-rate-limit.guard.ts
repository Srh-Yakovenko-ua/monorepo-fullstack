import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request, RequestHandler, Response } from "express";

import { Injectable } from "@nestjs/common";
import { ipKeyGenerator, MemoryStore, rateLimit } from "express-rate-limit";

import { TooManyRequestsError } from "../errors.js";
import { AUTH_RATE_LIMIT } from "../rate-limit-config.js";

const authRateLimitStore = new MemoryStore();

const authRateLimitMiddleware: RequestHandler = rateLimit({
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError("Too many requests"));
  },
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "unknown")}:${req.path}`,
  legacyHeaders: false,
  limit: AUTH_RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: "draft-7",
  store: authRateLimitStore,
  windowMs: AUTH_RATE_LIMIT.WINDOW_MS,
});

export async function resetAuthRateLimit(): Promise<void> {
  await authRateLimitStore.resetAll();
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    return new Promise<boolean>((resolve, reject) => {
      authRateLimitMiddleware(request, response, (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }
}
