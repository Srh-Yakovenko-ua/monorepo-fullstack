import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "./jwt.js";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

function tamperPayloadSegment(token: string): string {
  const parts = token.split(".");
  const [header, payload, signature] = parts;
  if (
    parts.length !== 3 ||
    header === undefined ||
    payload === undefined ||
    signature === undefined
  ) {
    throw new Error("expected a 3-segment JWT");
  }
  const original = payload.charAt(0);
  const replacement = original === "A" ? "B" : "A";
  const tamperedPayload = replacement + payload.slice(1);
  return `${header}.${tamperedPayload}.${signature}`;
}

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips a userId payload through sign and verify", async () => {
    const token = await signAccessToken({ userId: 42 });

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const payload = await verifyAccessToken(token);
    expect(payload).toEqual({ userId: 42 });
  });

  it("rejects a token whose payload segment was modified", async () => {
    const token = await signAccessToken({ userId: 7 });
    const tampered = tamperPayloadSegment(token);

    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode(
      "another-secret-that-is-at-least-32-characters-long",
    );
    const foreignToken = await new SignJWT({ userId: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(otherSecret);

    await expect(verifyAccessToken(foreignToken)).rejects.toThrow();
  });

  it("rejects a token whose userId is a string", async () => {
    const badToken = await new SignJWT({ userId: "foo" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(secret);

    await expect(verifyAccessToken(badToken)).rejects.toThrow("Invalid token payload");
  });

  it("rejects a token whose userId is a non-integer number", async () => {
    const badToken = await new SignJWT({ userId: 1.5 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(secret);

    await expect(verifyAccessToken(badToken)).rejects.toThrow("Invalid token payload");
  });
});

describe("signRefreshToken / verifyRefreshToken", () => {
  it("returns token plus issuedAt, expiresAt, jti that match the verified payload", async () => {
    const result = await signRefreshToken({ deviceId: "device-1", userId: 99 });

    expect(typeof result.token).toBe("string");
    expect(result.token.split(".").length).toBe(3);
    expect(typeof result.jti).toBe("string");
    expect(result.jti.length).toBeGreaterThan(0);
    expect(result.issuedAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(result.issuedAt.getTime());

    const payload = await verifyRefreshToken(result.token);
    expect(payload.deviceId).toBe("device-1");
    expect(payload.userId).toBe(99);
    expect(payload.jti).toBe(result.jti);
    expect(payload.iat).toBe(Math.floor(result.issuedAt.getTime() / 1000));
    expect(payload.exp).toBe(Math.floor(result.expiresAt.getTime() / 1000));
  });

  it("rejects a refresh token whose payload is missing deviceId", async () => {
    const badToken = await new SignJWT({ userId: 5 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setJti("some-jti")
      .setExpirationTime("2m")
      .sign(secret);

    await expect(verifyRefreshToken(badToken)).rejects.toThrow("Invalid refresh token payload");
  });

  it("rejects a refresh token whose userId is not a positive integer", async () => {
    const badToken = await new SignJWT({ deviceId: "d", userId: -3 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setJti("some-jti")
      .setExpirationTime("2m")
      .sign(secret);

    await expect(verifyRefreshToken(badToken)).rejects.toThrow("Invalid refresh token payload");
  });

  it("rejects a refresh token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode(
      "another-secret-that-is-at-least-32-characters-long",
    );
    const foreignToken = await new SignJWT({ deviceId: "d", userId: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setJti("some-jti")
      .setExpirationTime("2m")
      .sign(otherSecret);

    await expect(verifyRefreshToken(foreignToken)).rejects.toThrow();
  });
});
