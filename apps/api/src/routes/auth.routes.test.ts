import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createAdminAndLogin } from "../test/auth-helpers.js";

const app = createApp();

const validUser = {
  email: "john@example.dev",
  login: "john",
  password: "password1",
};

const createUserViaApi = async (override: Partial<typeof validUser> = {}) => {
  const adminToken = await createAdminAndLogin(app);
  return request(app)
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
  const res = await request(app).post("/api/auth/login").send({ loginOrEmail, password });
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookieHeader = Array.isArray(setCookie) ? (setCookie[0] ?? "") : (setCookie ?? "");
  return { accessToken: res.body.accessToken as string, refreshCookieHeader: cookieHeader };
}

describe("Auth API", () => {
  describe("POST /api/auth/login", () => {
    it("returns 200 with accessToken on correct login and password", async () => {
      await createUserViaApi();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(typeof res.body.accessToken).toBe("string");
    });

    it("accessToken is a well-formed JWT with three base64url segments", async () => {
      await createUserViaApi();

      const res = await request(app)
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

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
    });

    it("sets a refreshToken HttpOnly cookie with correct attributes", async () => {
      await createUserViaApi();

      const res = await request(app)
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

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body on non-existent loginOrEmail", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: "nobody@example.dev", password: "password1" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 400 with errorsMessages when loginOrEmail is empty", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: "", password: "password1" });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it("returns 400 with errorsMessages when password is empty", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "" });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errorsMessages)).toBe(true);
    });

    it("returns 400 when body is missing both fields", async () => {
      const res = await request(app).post("/api/auth/login").send({});

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

      const res = await request(app)
        .get("/api/auth/me")
        .set("authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.login).toBe(validUser.login);
      expect(typeof res.body.userId).toBe("string");
      expect(res.body.role).toBe("user");
    });

    it("returns 401 with empty body when no Authorization header is sent", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when token is garbage", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("authorization", "Bearer garbage.token.value");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when Authorization uses Basic scheme", async () => {
      const res = await request(app).get("/api/auth/me").set("authorization", "Basic dXNlcjpwYXNz");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 with empty body when token belongs to a deleted user", async () => {
      const adminToken = await createAdminAndLogin(app);
      const created = await request(app)
        .post("/api/users")
        .set("authorization", `Bearer ${adminToken}`)
        .send(validUser);
      const userId: string = created.body.id;
      const { accessToken } = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });

      await request(app)
        .delete(`/api/users/${userId}`)
        .set("authorization", `Bearer ${adminToken}`);

      const res = await request(app)
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

      const res = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`);

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
      const res = await request(app).post("/api/auth/refresh-token");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 when cookie value is garbage", async () => {
      const res = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", "refreshToken=garbage.token.value");

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

      await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`);

      const replayRes = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${originalToken}`);

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

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", `refreshToken=${token}`);

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

      await request(app).post("/api/auth/logout").set("Cookie", `refreshToken=${token}`);

      const replayRes = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${token}`);

      expect(replayRes.status).toBe(401);
      expect(replayRes.text).toBe("");
    });

    it("returns 401 when no cookie is sent", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });
});
