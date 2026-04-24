import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.jwtSecret);

export type AccessTokenPayload = { userId: string };
export type RefreshTokenPayload = { exp: number; jti: string; userId: string };

const refreshTokenPayloadSchema = z.object({
  exp: z.number(),
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
  userId: string;
}): Promise<{ expiresAt: Date; jti: string; token: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({ userId: input.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime(env.jwtRefreshExpiresIn)
    .sign(secret);

  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const expiresAt = new Date((payload.exp as number) * 1000);

  return { expiresAt, jti, token };
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
