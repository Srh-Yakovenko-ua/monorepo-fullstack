import type { ExecutionContext } from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import { ThrottlerStorageService } from "@nestjs/throttler";
import { beforeEach, describe, expect, it } from "vitest";

import { TooManyRequestsError } from "../exceptions/errors.js";
import { AuthThrottlerGuard } from "./auth-throttler.guard.js";

const THROTTLE_LIMIT = 5;
const THROTTLE_TTL_MS = 10_000;

function createExecutionContext(ip: string): ExecutionContext {
  const handler = function handler() {};
  const classRef = class HandlerClass {};
  const response = { header: () => response };
  return {
    getClass: () => classRef,
    getHandler: () => handler,
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => ({ headers: {}, ip }),
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

async function createGuard(): Promise<{
  guard: AuthThrottlerGuard;
  storage: ThrottlerStorageService;
}> {
  const storage = new ThrottlerStorageService();
  const reflector = new Reflector();
  const guard = new AuthThrottlerGuard(
    { throttlers: [{ limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL_MS }] },
    storage,
    reflector,
  );
  await guard.onModuleInit();
  return { guard, storage };
}

describe("AuthThrottlerGuard", () => {
  let guard: AuthThrottlerGuard;
  let storage: ThrottlerStorageService;

  beforeEach(async () => {
    ({ guard, storage } = await createGuard());
  });

  it("allows up to the configured limit of requests from a single tracker", async () => {
    const ctx = createExecutionContext("10.0.0.1");

    for (let attempt = 0; attempt < THROTTLE_LIMIT; attempt += 1) {
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    }
  });

  it("throws TooManyRequestsError on the request immediately past the limit", async () => {
    const ctx = createExecutionContext("10.0.0.2");

    for (let attempt = 0; attempt < THROTTLE_LIMIT; attempt += 1) {
      await guard.canActivate(ctx);
    }

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("tracks limits independently per source IP", async () => {
    const alice = createExecutionContext("10.0.0.10");
    const bob = createExecutionContext("10.0.0.11");

    for (let attempt = 0; attempt < THROTTLE_LIMIT; attempt += 1) {
      await guard.canActivate(alice);
    }

    const bobResult = await guard.canActivate(bob);
    expect(bobResult).toBe(true);
    await expect(guard.canActivate(alice)).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("starts fresh after the shared storage is reset between tests", async () => {
    const ctx = createExecutionContext("10.0.0.20");

    for (let attempt = 0; attempt < THROTTLE_LIMIT; attempt += 1) {
      await guard.canActivate(ctx);
    }

    storage.onApplicationShutdown();
    storage.storage.clear();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
