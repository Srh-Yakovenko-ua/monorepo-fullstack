import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { describe, expect, it } from "vitest";

import { type RequestUser } from "../auth-helper.js";
import { ForbiddenError, UnauthorizedError } from "../exceptions/errors.js";
import { AdminGuard } from "./admin.guard.js";

type RequestLike = Pick<Request, "headers"> & { user?: RequestUser };

function createContext(request: RequestLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getNext: () => undefined,
      getRequest: () => request,
      getResponse: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function makeUser(role: RequestUser["role"]): RequestUser {
  return { email: "x@example.com", login: "x", role, userId: 1 };
}

describe("AdminGuard", () => {
  it("throws UnauthorizedError when request.user is absent", () => {
    const guard = new AdminGuard();

    expect(() => guard.canActivate(createContext({ headers: {} }))).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError when role is user", () => {
    const guard = new AdminGuard();
    const ctx = createContext({ headers: {}, user: makeUser(ROLE.user) });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenError);
  });

  it("returns true when role is admin", () => {
    const guard = new AdminGuard();
    const ctx = createContext({ headers: {}, user: makeUser(ROLE.admin) });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("returns true when role is superAdmin", () => {
    const guard = new AdminGuard();
    const ctx = createContext({ headers: {}, user: makeUser(ROLE.superAdmin) });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
