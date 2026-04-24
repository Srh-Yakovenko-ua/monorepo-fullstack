import type {
  CreateUserInput,
  LoginInput,
  LoginSuccessViewModel,
  MeViewModel,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";
import type { CookieOptions, Request, Response } from "express";

import { env } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import * as authService from "../services/auth.service.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response<LoginSuccessViewModel>,
): Promise<void> {
  const { accessToken, refreshExpiresAt, refreshToken } = await authService.login(req.body);
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    buildRefreshCookieOptions(refreshExpiresAt.getTime() - Date.now()),
  );
  res.status(HTTP_STATUS.OK).json({ accessToken });
}

export async function logout(req: Request, res: Response<void>): Promise<void> {
  const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!token) throw new UnauthorizedError();

  await authService.logout(token);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function me(req: Request, res: Response<MeViewModel>): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  const result = await authService.getCurrentUser(user.userId);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function refreshToken(
  req: Request,
  res: Response<LoginSuccessViewModel>,
): Promise<void> {
  const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!token) throw new UnauthorizedError();

  const {
    accessToken,
    refreshExpiresAt,
    refreshToken: newRefreshToken,
  } = await authService.refreshTokens(token);
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    newRefreshToken,
    buildRefreshCookieOptions(refreshExpiresAt.getTime() - Date.now()),
  );
  res.status(HTTP_STATUS.OK).json({ accessToken });
}

export async function registration(
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response,
): Promise<void> {
  await authService.register(req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function registrationConfirmation(
  req: Request<unknown, unknown, RegistrationConfirmationInput>,
  res: Response,
): Promise<void> {
  await authService.confirmRegistration(req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function registrationEmailResending(
  req: Request<unknown, unknown, RegistrationEmailResendingInput>,
  res: Response,
): Promise<void> {
  await authService.resendConfirmationEmail(req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

function buildRefreshCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    maxAge: maxAgeMs,
    path: "/",
    sameSite: "strict",
    secure: env.nodeEnv === "production",
  };
}
