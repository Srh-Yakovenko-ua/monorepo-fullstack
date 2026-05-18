import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

import { UsersRepository } from "../../modules/user-accounts/users/infrastructure/users.repository.js";
import { AuthHelper, type RequestUser } from "../auth-helper.js";
import { UnauthorizedError } from "../exceptions/errors.js";
import { signAccessToken } from "../jwt.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

type RequestLike = Pick<Request, "headers"> & { user?: RequestUser };

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

function createAuthHelper(resolve: AuthHelper["resolveBearerUser"]): AuthHelper {
  return { resolveBearerUser: resolve } as unknown as AuthHelper;
}

function createContext(request: RequestLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

const requestUser: RequestUser = {
  email: "alice@example.com",
  login: "alice",
  role: ROLE.user,
  userId: 42,
};

describe("JwtAuthGuard", () => {
  it("throws UnauthorizedError when Authorization header is missing", async () => {
    const guard = new JwtAuthGuard(createAuthHelper(vi.fn()));
    const ctx = createContext({ headers: {} });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when Authorization header lacks Bearer scheme", async () => {
    const guard = new JwtAuthGuard(createAuthHelper(vi.fn()));
    const ctx = createContext({ headers: { authorization: "Basic abc123" } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when Bearer token is empty", async () => {
    const guard = new JwtAuthGuard(createAuthHelper(vi.fn()));
    const ctx = createContext({ headers: { authorization: "Bearer " } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("attaches user to request and returns true when token resolves to a user", async () => {
    const resolveBearerUser = vi.fn().mockResolvedValue(requestUser);
    const guard = new JwtAuthGuard(createAuthHelper(resolveBearerUser));
    const token = await signAccessToken({ userId: requestUser.userId });
    const request: RequestLike = { headers: { authorization: `Bearer ${token}` } };
    const ctx = createContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toEqual(requestUser);
    expect(resolveBearerUser).toHaveBeenCalledWith(token);
  });

  it("throws UnauthorizedError when token has valid shape but user not found", async () => {
    const resolveBearerUser = vi.fn().mockResolvedValue(null);
    const guard = new JwtAuthGuard(createAuthHelper(resolveBearerUser));
    const token = await signAccessToken({ userId: 999 });
    const ctx = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when token is expired (real AuthHelper integration)", async () => {
    const expiredToken = await new SignJWT({ userId: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("-1s")
      .sign(secret);
    const findById = vi.fn().mockResolvedValue(null);
    const realHelper = new AuthHelper({ findById } as unknown as UsersRepository);
    const guard = new JwtAuthGuard(realHelper);
    const ctx = createContext({ headers: { authorization: `Bearer ${expiredToken}` } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(findById).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedError when token signature is invalid (real AuthHelper integration)", async () => {
    const findById = vi.fn().mockResolvedValue(null);
    const realHelper = new AuthHelper({ findById } as unknown as UsersRepository);
    const guard = new JwtAuthGuard(realHelper);
    const ctx = createContext({ headers: { authorization: "Bearer not-a-real-jwt" } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(findById).not.toHaveBeenCalled();
  });

  it("matches Bearer scheme case-insensitively", async () => {
    const resolveBearerUser = vi.fn().mockResolvedValue(requestUser);
    const guard = new JwtAuthGuard(createAuthHelper(resolveBearerUser));
    const token = await signAccessToken({ userId: requestUser.userId });
    const ctx = createContext({ headers: { authorization: `bearer ${token}` } });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(resolveBearerUser).toHaveBeenCalledWith(token);
  });
});
