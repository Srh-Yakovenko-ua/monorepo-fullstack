import { fromUnixTime } from "date-fns";
import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.jwtSecret);

export type AccessTokenPayload = { userId: string };
export type RefreshTokenPayload = {
  deviceId: string;
  exp: number;
  iat: number;
  jti: string;
  userId: string;
};

const refreshTokenPayloadSchema = z.object({
  deviceId: z.string(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(),
  userId: z.string(),
});

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.jwtAccessExpiresIn)
    .sign(secret);
}

export async function signRefreshToken(input: {
  deviceId: string;
  userId: string;
}): Promise<{ expiresAt: Date; issuedAt: Date; jti: string; token: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({ deviceId: input.deviceId, userId: input.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(env.jwtRefreshExpiresIn)
    .sign(secret);

  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const parsed = refreshTokenPayloadSchema.parse(payload);
  const expiresAt = fromUnixTime(parsed.exp);
  const issuedAt = fromUnixTime(parsed.iat);

  return { expiresAt, issuedAt, jti, token };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (typeof payload.userId !== "string") throw new Error("Invalid token payload");
  return { userId: payload.userId };
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const parsed = refreshTokenPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Invalid refresh token payload");
  return parsed.data;
}
