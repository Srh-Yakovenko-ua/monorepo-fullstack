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

describe("Auth API", () => {
  describe("POST /api/auth/login", () => {
    it("returns 204 on correct login and password", async () => {
      await createUserViaApi();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: validUser.password });

      expect(res.status).toBe(204);
    });

    it("returns 204 on correct email and password", async () => {
      await createUserViaApi();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.email, password: validUser.password });

      expect(res.status).toBe(204);
    });

    it("returns 401 on wrong password", async () => {
      await createUserViaApi();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("returns 401 on non-existent loginOrEmail", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: "nobody@example.dev", password: "password1" });

      expect(res.status).toBe(401);
    });

    it("returns 400 when loginOrEmail is empty", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: "", password: "password1" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when password is empty", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ loginOrEmail: validUser.login, password: "" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when body is missing both fields", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
    });
  });
});
