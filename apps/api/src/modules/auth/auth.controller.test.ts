import type { INestApplication } from "@nestjs/common";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { UserModel } from "../../db/models/user.model.js";
import { sendEmail } from "../../lib/mailer.js";
import { createAdminAndLogin } from "../../test/auth-helpers.js";
import { createTestApp } from "../../test/create-test-app.js";

vi.mock("../../lib/mailer.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const sendEmailMock = vi.mocked(sendEmail);

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  app = await createTestApp();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

const TEST_ORIGIN = "http://localhost:5173";

const validUser = {
  email: "john@example.dev",
  login: "john",
  password: "password1",
};

const createUserViaApi = async (override: Partial<typeof validUser> = {}) => {
  const adminToken = await createAdminAndLogin(app);
  return request(server)
    .post("/api/users")
    .set("authorization", `Bearer ${adminToken}`)
    .send({ ...validUser, ...override });
};

function extractRefreshToken(setCookieHeader: string): string {
  const match = /refreshToken=([^;]+)/.exec(setCookieHeader);
  return match?.[1] ?? "";
}

async function loginAs({
  loginOrEmail,
  password,
}: {
  loginOrEmail: string;
  password: string;
}): Promise<{ accessToken: string; refreshCookieHeader: string }> {
  const res = await request(server).post("/api/auth/login").send({ loginOrEmail, password });
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookieHeader = Array.isArray(setCookie) ? (setCookie[0] ?? "") : (setCookie ?? "");
  return { accessToken: res.body.accessToken as string, refreshCookieHeader: cookieHeader };
}

async function waitFor<T>(probe: () => Promise<null | T | undefined>, attempts = 50): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const value = await probe();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("waitFor timed out");
}

describe("Auth API", () => {
  describe("POST /api/auth/login", () => {
    it("returns 200 with accessToken on correct login and password", async () => {
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(typeof res.body.accessToken).toBe("string");
    });

    it("accessToken is a well-formed JWT with three base64url segments", async () => {
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });

      const token: string = res.body.accessToken;
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
      const base64url = /^[A-Za-z0-9_-]+$/;
      const [header, payload, signature] = parts;
      expect(base64url.test(header ?? "")).toBe(true);
      expect(base64url.test(payload ?? "")).toBe(true);
      expect(base64url.test(signature ?? "")).toBe(true);
    });

    it("returns 200 with accessToken on correct email and password", async () => {
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
    });

    it("sets a refreshToken HttpOnly cookie with correct attributes", async () => {
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });

      expect(res.status).toBe(200);
      const setCookie = res.headers["set-cookie"] as string[] | undefined;
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? (setCookie[0] ?? "") : "";
      expect(cookieStr).toMatch(/refreshToken=/);
      expect(cookieStr).toMatch(/HttpOnly/i);
      expect(cookieStr).toMatch(/Path=\//i);
      expect(cookieStr).toMatch(/SameSite=Strict/i);
    });

    it("returns 401 with empty body on wrong password", async () => {
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body on non-existent loginOrEmail", async () => {
      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: "nobody@example.dev", password: "password1" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 400 with errorsMessages when loginOrEmail is empty", async () => {
      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: "", password: "password1" });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it("returns 400 with errorsMessages when password is empty", async () => {
      const res = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "" });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it("returns 400 when body is missing both fields", async () => {
      const res = await request(server).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 200 with email, login, userId for a valid bearer token", async () => {
      await createUserViaApi();
      const { accessToken } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });

      const res = await request(server)
        .get("/api/auth/me")
        .set("authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.login).toBe(validUser.login);
      expect(typeof res.body.userId).toBe("string");
      expect(res.body.role).toBe("user");
    });

    it("returns 401 with empty body when no Authorization header is sent", async () => {
      const res = await request(server).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when token is garbage", async () => {
      const res = await request(server)
        .get("/api/auth/me")
        .set("authorization", "Bearer garbage.token.value");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when Authorization uses Basic scheme", async () => {
      const res = await request(server)
        .get("/api/auth/me")
        .set("authorization", "Basic dXNlcjpwYXNz");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when token belongs to a deleted user", async () => {
      const adminToken = await createAdminAndLogin(app);
      const created = await request(server)
        .post("/api/users")
        .set("authorization", `Bearer ${adminToken}`)
        .send(validUser);
      const userId: string = created.body.id;
      const { accessToken } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });

      await request(server)
        .delete(`/api/users/${userId}`)
        .set("authorization", `Bearer ${adminToken}`);

      const res = await request(server)
        .get("/api/auth/me")
        .set("authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    it("returns 200 with new accessToken and rotated refreshToken cookie given valid cookie", async () => {
      await createUserViaApi();
      const { refreshCookieHeader } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });
      const originalToken = extractRefreshToken(refreshCookieHeader);

      const res = await request(server)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`)
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe("string");

      const newSetCookie = res.headers["set-cookie"] as string[] | undefined;
      expect(newSetCookie).toBeDefined();
      const newCookieStr = Array.isArray(newSetCookie) ? (newSetCookie[0] ?? "") : "";
      expect(newCookieStr).toMatch(/refreshToken=/);
      const newToken = extractRefreshToken(newCookieStr);
      expect(newToken).not.toBe(originalToken);
    });

    it("returns 401 when no cookie is sent", async () => {
      const res = await request(server).post("/api/auth/refresh-token").set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 when cookie value is garbage", async () => {
      const res = await request(server)
        .post("/api/auth/refresh-token")
        .set("Cookie", "refreshToken=garbage.token.value")
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 when old refreshToken is reused after rotation", async () => {
      await createUserViaApi();
      const { refreshCookieHeader } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });
      const originalToken = extractRefreshToken(refreshCookieHeader);

      await request(server)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`)
        .set("Origin", TEST_ORIGIN);

      const replayRes = await request(server)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`)
        .set("Origin", TEST_ORIGIN);

      expect(replayRes.status).toBe(401);
      expect(replayRes.text).toBe("");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 204 and clears the refreshToken cookie", async () => {
      await createUserViaApi();
      const { refreshCookieHeader } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });
      const token = extractRefreshToken(refreshCookieHeader);

      const res = await request(server)
        .post("/api/auth/logout")
        .set("Cookie", `refreshToken=${token}`)
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(204);
      const setCookie = res.headers["set-cookie"] as string[] | undefined;
      const cookieStr = Array.isArray(setCookie) ? (setCookie[0] ?? "") : (setCookie ?? "");
      expect(cookieStr).toMatch(/refreshToken=;|Max-Age=0/i);
    });

    it("returns 401 when refreshToken is used after logout", async () => {
      await createUserViaApi();
      const { refreshCookieHeader } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });
      const token = extractRefreshToken(refreshCookieHeader);

      await request(server)
        .post("/api/auth/logout")
        .set("Cookie", `refreshToken=${token}`)
        .set("Origin", TEST_ORIGIN);

      const replayRes = await request(server)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${token}`)
        .set("Origin", TEST_ORIGIN);

      expect(replayRes.status).toBe(401);
      expect(replayRes.text).toBe("");
    });

    it("returns 401 when no cookie is sent", async () => {
      const res = await request(server).post("/api/auth/logout").set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });

  describe("POST /api/auth/password-recovery", () => {
    it("returns 204 and sends an email with a recoveryCode link for an existing email", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/password-recovery")
        .send({ email: validUser.email });

      expect(res.status).toBe(204);
      await waitFor(async () => sendEmailMock.mock.calls[0]);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.to).toBe(validUser.email);
      expect(call?.subject).toMatch(/recovery/i);
      expect(call?.html).toMatch(/recoveryCode=[0-9a-f-]{36}/);
    });

    it("returns 204 and does NOT send an email for an unknown email (anti-enumeration)", async () => {
      sendEmailMock.mockClear();

      const res = await request(server)
        .post("/api/auth/password-recovery")
        .send({ email: "ghost@nowhere.dev" });

      expect(res.status).toBe(204);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("returns 204 even when sendEmail throws (errors are logged, not surfaced)", async () => {
      sendEmailMock.mockClear();
      sendEmailMock.mockRejectedValueOnce(new Error("smtp down"));
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/password-recovery")
        .send({ email: validUser.email });

      expect(res.status).toBe(204);
      await waitFor(async () => sendEmailMock.mock.calls[0]);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("normalizes email casing so uppercase input still triggers the email", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();

      const res = await request(server)
        .post("/api/auth/password-recovery")
        .send({ email: validUser.email.toUpperCase() });

      expect(res.status).toBe(204);
      await waitFor(async () => sendEmailMock.mock.calls[0]);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock.mock.calls[0]?.[0]?.to).toBe(validUser.email);
    });

    it("throttles repeated requests for the same email within 60 seconds", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();

      await request(server).post("/api/auth/password-recovery").send({ email: validUser.email });
      await waitFor(async () => sendEmailMock.mock.calls[0]);
      await request(server).post("/api/auth/password-recovery").send({ email: validUser.email });
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("returns 400 with errorsMessages on invalid email format", async () => {
      const res = await request(server)
        .post("/api/auth/password-recovery")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
      expect(res.body.errorsMessages[0]?.field).toBe("email");
    });

    it("overwrites a previous recoveryCode when called twice past the throttle window", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();

      await request(server).post("/api/auth/password-recovery").send({ email: validUser.email });
      const firstCode = await waitFor(async () => {
        const u = await UserModel.findOne({ email: validUser.email }).lean();
        return u?.passwordRecovery?.code ?? null;
      });

      await UserModel.updateOne(
        { email: validUser.email },
        { "passwordRecovery.expiresAt": new Date(Date.now() + 60 * 60 * 1000 - 5 * 60 * 1000) },
      );

      await request(server).post("/api/auth/password-recovery").send({ email: validUser.email });
      const secondCode = await waitFor(async () => {
        const u = await UserModel.findOne({ email: validUser.email }).lean();
        const code = u?.passwordRecovery?.code;
        return code && code !== firstCode ? code : null;
      });

      expect(firstCode).toBeTruthy();
      expect(secondCode).toBeTruthy();
      expect(secondCode).not.toBe(firstCode);
    });
  });

  describe("POST /api/auth/new-password", () => {
    async function requestRecoveryAndGetCode(email: string): Promise<string> {
      await request(server).post("/api/auth/password-recovery").send({ email });
      return waitFor(async () => {
        const user = await UserModel.findOne({ email }).lean();
        return user?.passwordRecovery?.code ?? null;
      });
    }

    it("returns 204 and updates the password so old fails 401 and new succeeds 200", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();
      const recoveryCode = await requestRecoveryAndGetCode(validUser.email);
      const nextPassword = "newpass1";

      const res = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: nextPassword, recoveryCode });

      expect(res.status).toBe(204);

      const oldLogin = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: nextPassword });
      expect(newLogin.status).toBe(200);
      expect(typeof newLogin.body.accessToken).toBe("string");
    });

    it("returns 400 with field=recoveryCode when recoveryCode is unknown", async () => {
      const res = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: "validpass1", recoveryCode: "this-code-does-not-exist" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages?.[0]?.field).toBe("recoveryCode");
    });

    it("returns 400 with field=recoveryCode when recoveryCode is expired", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();
      const recoveryCode = await requestRecoveryAndGetCode(validUser.email);

      await UserModel.updateOne(
        { email: validUser.email },
        { "passwordRecovery.expiresAt": new Date(Date.now() - 60_000) },
      );

      const res = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: "newpass1", recoveryCode });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages?.[0]?.field).toBe("recoveryCode");
    });

    it("only one of two parallel new-password requests with the same code succeeds", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();
      const recoveryCode = await requestRecoveryAndGetCode(validUser.email);

      const responses = await Promise.all([
        request(server)
          .post("/api/auth/new-password")
          .send({ newPassword: "racepass1", recoveryCode }),
        request(server)
          .post("/api/auth/new-password")
          .send({ newPassword: "racepass1", recoveryCode }),
      ]);

      const successCount = responses.filter((r) => r.status === 204).length;
      const failureCount = responses.filter((r) => r.status === 400).length;
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
      const failed = responses.find((r) => r.status === 400);
      expect(failed?.body.errorsMessages?.[0]?.field).toBe("recoveryCode");
    });

    it("returns 400 when the same recoveryCode is reused after a successful reset", async () => {
      sendEmailMock.mockClear();
      await createUserViaApi();
      const recoveryCode = await requestRecoveryAndGetCode(validUser.email);

      const first = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: "newpass1", recoveryCode });
      expect(first.status).toBe(204);

      const replay = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: "anotherp1", recoveryCode });

      expect(replay.status).toBe(400);
      expect(replay.body.errorsMessages?.[0]?.field).toBe("recoveryCode");
    });

    it("returns 400 with field=newPassword when password is too short", async () => {
      const res = await request(server)
        .post("/api/auth/new-password")
        .send({ newPassword: "ab", recoveryCode: "anything" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages?.[0]?.field).toBe("newPassword");
    });
  });
});
