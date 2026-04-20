import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("returns 200 with status ok and required fields", async () => {
    const res = await request(createApp()).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("includes x-request-id header", async () => {
    const res = await request(createApp()).get("/api/health");

    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("propagates incoming x-request-id", async () => {
    const res = await request(createApp()).get("/api/health").set("x-request-id", "test-id-123");

    expect(res.headers["x-request-id"]).toBe("test-id-123");
  });
});
