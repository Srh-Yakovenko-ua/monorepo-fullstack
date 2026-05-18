import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";

import { SessionsRepository } from "../../modules/user-accounts/security/infrastructure/sessions.repository.js";
import { ForbiddenError, UnauthorizedError } from "../exceptions/errors.js";
import { signRefreshToken } from "../jwt.js";
import { RefreshSessionGuard } from "./refresh-session.guard.js";

type RequestLike = Pick<Request, "cookies" | "headers" | "method"> & {
  session?: { deviceId: string; userId: number };
};

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const allowedOrigin = "http://localhost:5173";

function createContext(request: RequestLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createSessionsRepo(
  overrides: Partial<{
    deleteByUserAndDevice: SessionsRepository["deleteByUserAndDevice"];
    findByUserAndDevice: SessionsRepository["findByUserAndDevice"];
  }> = {},
): SessionsRepository {
  return {
    deleteByUserAndDevice: vi.fn().mockResolvedValue(true),
    findByUserAndDevice: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as SessionsRepository;
}

describe("RefreshSessionGuard", () => {
  describe("origin/referer check on non-GET requests", () => {
    it("throws ForbiddenError when both Origin and Referer headers are missing", async () => {
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: { refreshToken: "anything" },
        headers: {},
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when Origin is not in the allow list", async () => {
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: { refreshToken: "anything" },
        headers: { origin: "http://evil.example" },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when Referer origin is not in the allow list", async () => {
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: { refreshToken: "anything" },
        headers: { referer: "http://evil.example/some/path" },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("accepts a matching Referer origin", async () => {
      const { jti, token } = await signRefreshToken({ deviceId: "device-1", userId: 7 });
      const repo = createSessionsRepo({
        findByUserAndDevice: vi.fn().mockResolvedValue({ tokenJti: jti }),
      });
      const guard = new RefreshSessionGuard(repo);
      const request: RequestLike = {
        cookies: { refreshToken: token },
        headers: { referer: `${allowedOrigin}/some/path` },
        method: "POST",
      };

      const result = await guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });

    it("skips origin/referer check on GET requests", async () => {
      const { jti, token } = await signRefreshToken({ deviceId: "device-1", userId: 7 });
      const repo = createSessionsRepo({
        findByUserAndDevice: vi.fn().mockResolvedValue({ tokenJti: jti }),
      });
      const guard = new RefreshSessionGuard(repo);
      const request: RequestLike = {
        cookies: { refreshToken: token },
        headers: {},
        method: "GET",
      };

      const result = await guard.canActivate(createContext(request));

      expect(result).toBe(true);
    });
  });

  describe("token and session validation", () => {
    it("throws UnauthorizedError when refreshToken cookie is missing", async () => {
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: {},
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError when refresh token signature is invalid", async () => {
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: { refreshToken: "not-a-real-jwt" },
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError when refresh token is expired", async () => {
      const expired = await new SignJWT({ deviceId: "device-1", userId: 7 })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setJti("some-jti")
        .setExpirationTime("-1s")
        .sign(secret);
      const guard = new RefreshSessionGuard(createSessionsRepo());
      const request: RequestLike = {
        cookies: { refreshToken: expired },
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError when no matching session exists", async () => {
      const { token } = await signRefreshToken({ deviceId: "device-1", userId: 7 });
      const findByUserAndDevice = vi.fn().mockResolvedValue(null);
      const repo = createSessionsRepo({ findByUserAndDevice });
      const guard = new RefreshSessionGuard(repo);
      const request: RequestLike = {
        cookies: { refreshToken: token },
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
      expect(findByUserAndDevice).toHaveBeenCalledWith({ deviceId: "device-1", userId: 7 });
    });

    it("deletes session and throws UnauthorizedError when jti has been rotated", async () => {
      const { token } = await signRefreshToken({ deviceId: "device-1", userId: 7 });
      const deleteByUserAndDevice = vi.fn().mockResolvedValue(true);
      const repo = createSessionsRepo({
        deleteByUserAndDevice,
        findByUserAndDevice: vi.fn().mockResolvedValue({ tokenJti: "different-jti" }),
      });
      const guard = new RefreshSessionGuard(repo);
      const request: RequestLike = {
        cookies: { refreshToken: token },
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
      expect(deleteByUserAndDevice).toHaveBeenCalledWith({ deviceId: "device-1", userId: 7 });
    });

    it("attaches session and returns true when token jti matches the stored session", async () => {
      const { jti, token } = await signRefreshToken({ deviceId: "device-1", userId: 7 });
      const repo = createSessionsRepo({
        findByUserAndDevice: vi.fn().mockResolvedValue({ tokenJti: jti }),
      });
      const guard = new RefreshSessionGuard(repo);
      const request: RequestLike = {
        cookies: { refreshToken: token },
        headers: { origin: allowedOrigin },
        method: "POST",
      };

      const result = await guard.canActivate(createContext(request));

      expect(result).toBe(true);
      expect(request.session).toEqual({ deviceId: "device-1", userId: 7 });
    });
  });
});
