import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

describe("errorHandler — body-parser errors", () => {
  it("returns 400 when JSON body is malformed", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("content-type", "application/json")
      .send("not-json");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(typeof res.body.message).toBe("string");
  });

  it("returns 413 when JSON body exceeds the size limit", async () => {
    const oversized = JSON.stringify({ blob: "x".repeat(1024 * 1024 + 100) });

    const res = await request(app)
      .post("/api/auth/login")
      .set("content-type", "application/json")
      .send(oversized);

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty("message");
  });
});
