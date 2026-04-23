import type {
  CreateUserInput,
  LoginInput,
  LoginSuccessViewModel,
  MeViewModel,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";
import type { Request, Response } from "express";

import { UnauthorizedError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import * as authService from "../services/auth.service.js";

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response<LoginSuccessViewModel>,
): Promise<void> {
  const result = await authService.login(req.body);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function me(req: Request, res: Response<MeViewModel>): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  const result = await authService.getCurrentUser(user.userId);
  res.status(HTTP_STATUS.OK).json(result);
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
