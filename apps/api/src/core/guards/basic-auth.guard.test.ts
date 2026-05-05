import type { INestApplication } from "@nestjs/common";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminAndLogin, createUserAndLogin } from "../../test/auth-helpers.js";
import { createTestApp } from "../../test/create-test-app.js";

const ADMIN_BASIC = `Basic ${Buffer.from("admin:qwerty").toString("base64")}`;

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  app = await createTestApp();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

describe("BasicAuthGuard", () => {
  describe("Basic auth", () => {
    it("returns 200 with correct user and password", async () => {
      const res = await request(server).get("/api/users").set("authorization", ADMIN_BASIC);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("returns 401 with wrong password", async () => {
      const wrong = `Basic ${Buffer.from("admin:nope").toString("base64")}`;
      const res = await request(server).get("/api/users").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong user", async () => {
      const wrong = `Basic ${Buffer.from("root:qwerty").toString("base64")}`;
      const res = await request(server).get("/api/users").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 when payload has no colon separator", async () => {
      const wrong = `Basic ${Buffer.from("noseparator").toString("base64")}`;
      const res = await request(server).get("/api/users").set("authorization", wrong);

      expect(res.status).toBe(401);
    });

    it("returns 401 with empty Basic payload", async () => {
      const res = await request(server).get("/api/users").set("authorization", "Basic ");

      expect(res.status).toBe(401);
    });

    it("returns 401 with non-Basic non-Bearer scheme", async () => {
      const res = await request(server).get("/api/users").set("authorization", "Digest something");

      expect(res.status).toBe(401);
    });

    it("returns 401 without Authorization header", async () => {
      const res = await request(server).get("/api/users");

      expect(res.status).toBe(401);
    });
  });

  describe("Bearer auth (integration via /api/users)", () => {
    it("passes with admin JWT and creates a user", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(server)
        .post("/api/users")
        .set("authorization", `Bearer ${adminToken}`)
        .send({ email: "viabearer@test.dev", login: "viabearer", password: "password1" });

      expect(res.status).toBe(201);
    });

    it("returns 401 with garbage Bearer token", async () => {
      const res = await request(server)
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

      const res = await request(server)
        .get("/api/users")
        .set("authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Basic auth on real /api/users routes", () => {
    it("creates a user via Basic admin:qwerty", async () => {
      const res = await request(server)
        .post("/api/users")
        .set("authorization", ADMIN_BASIC)
        .send({ email: "viabasic@test.dev", login: "viabasic", password: "password1" });

      expect(res.status).toBe(201);
      expect(res.body.login).toBe("viabasic");
    });

    it("lists users via Basic admin:qwerty", async () => {
      const res = await request(server).get("/api/users").set("authorization", ADMIN_BASIC);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("returns 401 on Basic with wrong password against /api/users", async () => {
      const wrong = `Basic ${Buffer.from("admin:wrong").toString("base64")}`;
      const res = await request(server)
        .post("/api/users")
        .set("authorization", wrong)
        .send({ email: "x@test.dev", login: "x", password: "password1" });

      expect(res.status).toBe(401);
    });
  });
});
