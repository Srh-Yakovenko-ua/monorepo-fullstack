import type { NextFunction, Request, Response } from "express";

import { timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="users"');
    next(new UnauthorizedError());
    return;
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const colonIndex = decoded.indexOf(":");

  if (colonIndex === -1) {
    res.setHeader("WWW-Authenticate", 'Basic realm="users"');
    next(new UnauthorizedError());
    return;
  }

  const username = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const expectedUsername = Buffer.from(env.basicAuthUsername);
  const expectedPassword = Buffer.from(env.basicAuthPassword);
  const providedUsername = Buffer.from(username);
  const providedPassword = Buffer.from(password);

  const usernameMatch =
    expectedUsername.length === providedUsername.length &&
    timingSafeEqual(expectedUsername, providedUsername);

  const passwordMatch =
    expectedPassword.length === providedPassword.length &&
    timingSafeEqual(expectedPassword, providedPassword);

  if (!usernameMatch || !passwordMatch) {
    res.setHeader("WWW-Authenticate", 'Basic realm="users"');
    next(new UnauthorizedError());
    return;
  }

  next();
}
