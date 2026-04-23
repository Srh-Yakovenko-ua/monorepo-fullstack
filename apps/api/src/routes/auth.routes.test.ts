import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validUser = {
  email: "john@example.dev",
  login: "john",
  password: "password1",
};

const createUserViaApi = async (override: Partial<typeof validUser> = {}) =>
  request(app)
    .post("/api/users")
    .auth("admin", "qwerty")
    .send({ ...validUser, ...override });

async function loginAs({
  loginOrEmail,
  password,
}: {
  loginOrEmail: string;
  password: string;
}): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ loginOrEmail, password });
  return res.body.accessToken as string;
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
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app).get("/api/auth/me").set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.login).toBe(validUser.login);
      expect(typeof res.body.userId).toBe("string");
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
      const created = await createUserViaApi();
      const userId: string = created.body.id;
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      await request(app).delete(`/api/users/${userId}`).auth("admin", "qwerty");

      const res = await request(app).get("/api/auth/me").set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });
});
