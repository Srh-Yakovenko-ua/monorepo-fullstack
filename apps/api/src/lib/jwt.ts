import { jwtVerify, SignJWT } from "jose";

import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.jwtSecret);

export type AccessTokenPayload = { userId: string };

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (typeof payload.userId !== "string") throw new Error("Invalid token payload");
  return { userId: payload.userId };
}
