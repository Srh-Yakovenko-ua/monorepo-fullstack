import type { Express } from "express";

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createAdminAndLogin, createUserAndLogin } from "../test/auth-helpers.js";
import { errorHandler } from "./errorHandler.js";
import { requireAdminAuth } from "./require-admin-auth.js";

const ADMIN_BASIC = `Basic ${Buffer.from("admin:qwerty").toString("base64")}`;

function buildProbeApp(): Express {
  const app = express();
  app.use(express.json());
  app.get("/probe", requireAdminAuth, (req, res) => {
    res.status(200).json({ ok: true, user: req.user ?? null });
  });
  app.use(errorHandler);
  return app;
}

describe("requireAdminAuth middleware", () => {
  describe("Basic auth", () => {
    const app = buildProbeApp();

    it("passes with correct user and password", async () => {
      const res = await request(app).get("/probe").set("authorization", ADMIN_BASIC);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, user: null });
    });

    it("returns 401 with wrong password", async () => {
      const wrong = `Basic ${Buffer.from("admin:nope").toString("base64")}`;
      const res = await request(app).get("/probe").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong user", async () => {
      const wrong = `Basic ${Buffer.from("root:qwerty").toString("base64")}`;
      const res = await request(app).get("/probe").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 when payload has no colon separator", async () => {
      const wrong = `Basic ${Buffer.from("noseparator").toString("base64")}`;
      const res = await request(app).get("/probe").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 with empty Basic payload", async () => {
      const res = await request(app).get("/probe").set("authorization", "Basic ");

      expect(res.status).toBe(401);
    });

    it("returns 401 with non-Basic non-Bearer scheme", async () => {
      const res = await request(app).get("/probe").set("authorization", "Digest something");

      expect(res.status).toBe(401);
    });

    it("returns 401 without Authorization header", async () => {
      const res = await request(app).get("/probe");

      expect(res.status).toBe(401);
    });
  });

  describe("Bearer auth (integration via /api/users)", () => {
    const app = createApp();

    it("passes with admin JWT and creates a user", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(app)
        .post("/api/users")
        .set("authorization", `Bearer ${adminToken}`)
        .send({ email: "viabearer@test.dev", login: "viabearer", password: "password1" });

      expect(res.status).toBe(201);
    });

    it("returns 401 with garbage Bearer token", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("authorization", "Bearer garbage.token.value");

      expect(res.status).toBe(401);
    });

    it("returns 403 with user-role JWT", async () => {
      const userToken = await createUserAndLogin(app, {
        email: "regular@test.dev",
        login: "regular",
        password: "password1",
      });

      const res = await request(app).get("/api/users").set("authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Basic auth on real /api/users routes", () => {
    const app = createApp();

    it("creates a user via Basic admin:qwerty", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("authorization", ADMIN_BASIC)
        .send({ email: "viabasic@test.dev", login: "viabasic", password: "password1" });

      expect(res.status).toBe(201);
      expect(res.body.login).toBe("viabasic");
    });

    it("lists users via Basic admin:qwerty", async () => {
      const res = await request(app).get("/api/users").set("authorization", ADMIN_BASIC);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("returns 401 on Basic with wrong password against /api/users", async () => {
      const wrong = `Basic ${Buffer.from("admin:wrong").toString("base64")}`;
      const res = await request(app)
        .post("/api/users")
        .set("authorization", wrong)
        .send({ email: "x@test.dev", login: "x", password: "password1" });

      expect(res.status).toBe(401);
    });
  });
});
