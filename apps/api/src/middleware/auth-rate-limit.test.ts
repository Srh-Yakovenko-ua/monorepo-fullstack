import type { Express } from "express";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

vi.mock("../lib/mailer.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const TEST_ORIGIN = "http://localhost:5173";
const app: Express = createApp();

const wrongLoginPayload = {
  loginOrEmail: "doesnotexist",
  password: "whateverpass1",
};

function buildRegistrationPayload(suffix: number) {
  return {
    email: `rate-${suffix}@test.dev`,
    login: `rateuser${suffix}`,
    password: "ratepass1",
  };
}

describe("authRateLimit middleware", () => {
  it("returns 401 for first 5 wrong-credentials attempts and 429 starting from the 6th", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send(wrongLoginPayload);
      expect(res.status).toBe(401);
    }

    const sixth = await request(app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send(wrongLoginPayload);
    expect(sixth.status).toBe(429);

    const seventh = await request(app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send(wrongLoginPayload);
    expect(seventh.status).toBe(429);
  });

  it("counts each URL independently so hitting /login does not block /registration", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .send(wrongLoginPayload);
      expect(res.status).toBe(401);
    }

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request(app)
        .post("/api/auth/registration")
        .set("Origin", TEST_ORIGIN)
        .send(buildRegistrationPayload(attempt));
      expect(res.status).not.toBe(429);
    }
  });

  it("emits standard draft-7 RateLimit headers", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .send(wrongLoginPayload);

    expect(res.headers).toHaveProperty("ratelimit");
    expect(res.headers).toHaveProperty("ratelimit-policy");
    expect(res.headers).not.toHaveProperty("x-ratelimit-limit");
  });
});
