import type { LoginInput } from "@app/shared";
import type { Request, Response } from "express";

import { LoginInputSchema } from "@app/shared";

import { HTTP_STATUS } from "../lib/http-status.js";
import * as authService from "../services/auth.service.js";

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response<void>,
): Promise<void> {
  const input = LoginInputSchema.parse(req.body);
  await authService.validateCredentials(input);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
