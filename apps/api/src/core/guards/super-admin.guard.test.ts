import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "../../config/env.js";
import { type AuthHelper, type RequestUser } from "../auth-helper.js";
import { ForbiddenError, UnauthorizedError } from "../exceptions/errors.js";
import { SuperAdminGuard } from "./super-admin.guard.js";

type RequestLike = Pick<Request, "headers"> & { user?: RequestUser };

function createAuthHelper(resolved: null | RequestUser): AuthHelper {
  return { resolveBearerUser: vi.fn().mockResolvedValue(resolved) } as unknown as AuthHelper;
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

function encodeBasic(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`, "utf8").toString("base64")}`;
}

function makeUser(role: RequestUser["role"]): RequestUser {
  return { email: "x@example.com", login: "x", role, userId: 1 };
}

describe("SuperAdminGuard", () => {
  let guard: SuperAdminGuard;
  let authHelper: AuthHelper;

  beforeEach(() => {
    authHelper = createAuthHelper(null);
    guard = new SuperAdminGuard(authHelper);
  });

  describe("missing or malformed Authorization header", () => {
    it("throws UnauthorizedError when header is absent", async () => {
      await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError when scheme is unknown", async () => {
      const ctx = createContext({ headers: { authorization: "Digest abc" } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Basic auth", () => {
    it("passes with correct credentials", async () => {
      const ctx = createContext({
        headers: { authorization: encodeBasic(env.basicAuthLogin, env.basicAuthPassword) },
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it("throws UnauthorizedError with wrong password", async () => {
      const ctx = createContext({
        headers: { authorization: encodeBasic(env.basicAuthLogin, "wrong-password") },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError with wrong login", async () => {
      const ctx = createContext({
        headers: { authorization: encodeBasic("unknown-user", env.basicAuthPassword) },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when token has no colon separator", async () => {
      const noColon = Buffer.from("admin-no-separator", "utf8").toString("base64");
      const ctx = createContext({ headers: { authorization: `Basic ${noColon}` } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("Bearer auth", () => {
    it("passes when bearer resolves to superAdmin", async () => {
      const superAdminUser = makeUser(ROLE.superAdmin);
      authHelper = createAuthHelper(superAdminUser);
      guard = new SuperAdminGuard(authHelper);
      const request: RequestLike = { headers: { authorization: "Bearer valid-token" } };

      await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
      expect(request.user).toEqual(superAdminUser);
    });

    it("throws ForbiddenError when bearer resolves to plain user", async () => {
      authHelper = createAuthHelper(makeUser(ROLE.user));
      guard = new SuperAdminGuard(authHelper);
      const ctx = createContext({ headers: { authorization: "Bearer valid-token" } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it("throws ForbiddenError when bearer resolves to admin (not super-admin)", async () => {
      authHelper = createAuthHelper(makeUser(ROLE.admin));
      guard = new SuperAdminGuard(authHelper);
      const ctx = createContext({ headers: { authorization: "Bearer valid-token" } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenError);
    });

    it("throws UnauthorizedError when bearer token cannot be resolved", async () => {
      const ctx = createContext({ headers: { authorization: "Bearer expired" } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError);
    });
  });
});
