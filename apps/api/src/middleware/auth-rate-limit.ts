import type { RequestHandler } from "express";

import { ipKeyGenerator, MemoryStore, rateLimit } from "express-rate-limit";

import { TooManyRequestsError } from "../lib/errors.js";
import { AUTH_RATE_LIMIT } from "../lib/rate-limit-config.js";

const authRateLimitStore = new MemoryStore();

export const authRateLimit: RequestHandler = rateLimit({
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
