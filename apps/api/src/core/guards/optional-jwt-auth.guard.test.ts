import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signAccessToken } from "../jwt.js";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard.js";

type RequestLike = Pick<Request, "headers"> & { viewerId?: number };

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

function createContext(request: RequestLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe("OptionalJwtAuthGuard", () => {
  it("returns true and leaves viewerId undefined when Authorization header is missing", async () => {
    const guard = new OptionalJwtAuthGuard();
    const request: RequestLike = { headers: {} };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.viewerId).toBeUndefined();
  });

  it("returns true and leaves viewerId undefined when header lacks Bearer scheme", async () => {
    const guard = new OptionalJwtAuthGuard();
    const request: RequestLike = { headers: { authorization: "Basic abc" } };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.viewerId).toBeUndefined();
  });

  it("returns true and leaves viewerId undefined when token signature is invalid", async () => {
    const guard = new OptionalJwtAuthGuard();
    const request: RequestLike = { headers: { authorization: "Bearer not-a-real-jwt" } };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.viewerId).toBeUndefined();
  });

  it("returns true and leaves viewerId undefined when token is expired", async () => {
    const expiredToken = await new SignJWT({ userId: 99 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("-1s")
      .sign(secret);
    const guard = new OptionalJwtAuthGuard();
    const request: RequestLike = { headers: { authorization: `Bearer ${expiredToken}` } };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.viewerId).toBeUndefined();
  });

  it("returns true and attaches viewerId when token is valid", async () => {
    const token = await signAccessToken({ userId: 42 });
    const guard = new OptionalJwtAuthGuard();
    const request: RequestLike = { headers: { authorization: `Bearer ${token}` } };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.viewerId).toBe(42);
  });
});
