import type {
  CreateUserInput,
  LoginInput,
  LoginSuccessViewModel,
  MeViewModel,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";

import { compare } from "bcryptjs";
import { addHours, isAfter } from "date-fns";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import * as usersRepository from "../db/repositories/users.repository.js";
import { renderConfirmEmail } from "../lib/email-templates.js";
import { BadRequestError, UnauthorizedError } from "../lib/errors.js";
import { signAccessToken } from "../lib/jwt.js";
import { createLogger } from "../lib/logger.js";
import { sendEmail } from "../lib/mailer.js";
import * as usersService from "./users.service.js";

const log = createLogger("auth.service");

const CONFIRMATION_TTL_HOURS = 1;

export async function confirmRegistration({ code }: RegistrationConfirmationInput): Promise<void> {
  const user = await usersRepository.findByEmailConfirmationCode(code);

  if (!user) {
    throw new BadRequestError("Confirmation failed", {
      fields: [{ field: "code", message: "Confirmation code is invalid" }],
    });
  }

  if (user.emailConfirmation.isConfirmed) {
    throw new BadRequestError("Confirmation failed", {
      fields: [{ field: "code", message: "Email is already confirmed" }],
    });
  }

  if (!user.emailConfirmation.expiresAt || isAfter(new Date(), user.emailConfirmation.expiresAt)) {
    throw new BadRequestError("Confirmation failed", {
      fields: [{ field: "code", message: "Confirmation code expired" }],
    });
  }

  await usersRepository.markEmailConfirmed(user._id.toHexString());
}

export async function getCurrentUser(userId: string): Promise<MeViewModel> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new UnauthorizedError();

  return {
    email: user.email,
    login: user.login,
    userId: user._id.toHexString(),
  };
}

export async function login(input: LoginInput): Promise<LoginSuccessViewModel> {
  const user = await usersRepository.findByLoginOrEmail(input.loginOrEmail);
  if (!user) throw new UnauthorizedError("Invalid login or password");

  const passwordMatches = await compare(input.password, user.passwordHash);
  if (!passwordMatches) throw new UnauthorizedError("Invalid login or password");

  if (user.emailConfirmation?.isConfirmed === false) {
    throw new UnauthorizedError("Invalid login or password");
  }

  const accessToken = await signAccessToken({ userId: user._id.toHexString() });
  return { accessToken };
}

export async function register(input: CreateUserInput): Promise<void> {
  const code = randomUUID();
  const expiresAt = addHours(new Date(), CONFIRMATION_TTL_HOURS);

  const user = await usersService.registerUser({
    ...input,
    emailConfirmation: { code, expiresAt, isConfirmed: false },
  });

  const confirmLink = `${env.frontendUrl}/confirm-registration?code=${code}`;
  const template = renderConfirmEmail({ confirmLink, login: user.login });

  try {
    await sendEmail({ ...template, to: user.email });
  } catch (err) {
    log.error({ err, userId: user._id.toHexString() }, "Failed to send confirmation email");
  }
}

export async function resendConfirmationEmail({
  email,
}: RegistrationEmailResendingInput): Promise<void> {
  const user = await usersRepository.findByEmail(email);

  if (!user) {
    throw new BadRequestError("Resend failed", {
      fields: [{ field: "email", message: "Email not found" }],
    });
  }

  if (user.emailConfirmation.isConfirmed) {
    throw new BadRequestError("Resend failed", {
      fields: [{ field: "email", message: "Email is already confirmed" }],
    });
  }

  const code = randomUUID();
  const expiresAt = addHours(new Date(), CONFIRMATION_TTL_HOURS);

  await usersRepository.updateEmailConfirmation(user._id.toHexString(), {
    code,
    expiresAt,
    isConfirmed: false,
  });

  const confirmLink = `${env.frontendUrl}/confirm-registration?code=${code}`;
  const template = renderConfirmEmail({ confirmLink, login: user.login });

  try {
    await sendEmail({ ...template, to: user.email });
  } catch (err) {
    log.error({ err, userId: user._id.toHexString() }, "Failed to resend confirmation email");
  }
}
