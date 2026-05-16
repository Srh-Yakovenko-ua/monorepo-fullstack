import type {
  CreateUserInput,
  LoginInput,
  MeViewModel,
  NewPasswordInput,
  PasswordRecoveryInput,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";

import { Injectable } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { addHours, isAfter, subHours, subSeconds } from "date-fns";
import { randomUUID } from "node:crypto";
import { UAParser } from "ua-parser-js";

import { env } from "../../../../config/env.js";
import {
  renderConfirmEmail,
  renderPasswordRecoveryEmail,
} from "../../../../core/email-templates.js";
import {
  BadRequestError,
  HttpError,
  UnauthorizedError,
} from "../../../../core/exceptions/errors.js";
import { HTTP_STATUS } from "../../../../core/http-status.js";
import { signAccessToken, signRefreshToken } from "../../../../core/jwt.js";
import { createLogger } from "../../../../core/logger.js";
import { sendEmail } from "../../../../core/mailer.js";
import { SessionsRepository } from "../../security/infrastructure/sessions.repository.js";
import { UsersService } from "../../users/application/users.service.js";
import { UsersRepository } from "../../users/infrastructure/users.repository.js";

const log = createLogger("auth.service");

const CONFIRMATION_TTL_HOURS = 1;
const PASSWORD_RECOVERY_TTL_HOURS = 1;
const PASSWORD_RECOVERY_THROTTLE_SECONDS = 60;
const PASSWORD_HASH_SALT_ROUNDS = 10;
const FALLBACK_DEVICE_TITLE = "Unknown device";

export type LoginContext = {
  ip: string;
  userAgent: string | undefined;
};

export type LoginResult = {
  accessToken: string;
  refreshExpiresAt: Date;
  refreshToken: string;
};

export type RefreshResult = {
  accessToken: string;
  refreshExpiresAt: Date;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async confirmPasswordRecovery({ newPassword, recoveryCode }: NewPasswordInput): Promise<void> {
    const newPasswordHash = await hash(newPassword, PASSWORD_HASH_SALT_ROUNDS);
    const updated = await this.usersRepository.atomicResetPassword({
      newPasswordHash,
      now: new Date(),
      recoveryCode,
    });

    if (!updated) {
      throw new BadRequestError("Password recovery failed", {
        fields: [{ field: "recoveryCode", message: "Recovery code is invalid or expired" }],
      });
    }
  }

  async confirmRegistration({ code }: RegistrationConfirmationInput): Promise<void> {
    const user = await this.usersRepository.findByEmailConfirmationCode(code);

    if (!user) {
      throw new BadRequestError("Confirmation failed", {
        fields: [{ field: "code", message: "Confirmation code is invalid" }],
      });
    }

    if (user.emailIsConfirmed) {
      throw new BadRequestError("Confirmation failed", {
        fields: [{ field: "code", message: "Email is already confirmed" }],
      });
    }

    if (!user.emailConfirmationExpiresAt || isAfter(new Date(), user.emailConfirmationExpiresAt)) {
      throw new BadRequestError("Confirmation failed", {
        fields: [{ field: "code", message: "Confirmation code expired" }],
      });
    }

    await this.usersRepository.markEmailConfirmed(user.id);
  }

  async getCurrentUser(userId: number): Promise<MeViewModel> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedError();

    return {
      email: user.email,
      login: user.login,
      role: user.role,
      userId: user.id,
    };
  }

  async login(input: LoginInput, context: LoginContext): Promise<LoginResult> {
    const user = await this.usersRepository.findByLoginOrEmail(input.loginOrEmail);
    if (!user) throw new UnauthorizedError("Invalid login or password");

    const passwordMatches = await compare(input.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedError("Invalid login or password");

    if (!user.emailIsConfirmed) {
      throw new UnauthorizedError("Invalid login or password");
    }

    const userId = user.id;
    const deviceId = randomUUID();
    const title = parseDeviceTitle(context.userAgent);

    const [accessToken, refreshTokenResult] = await Promise.all([
      signAccessToken({ userId }),
      signRefreshToken({ deviceId, userId }),
    ]);

    await this.sessionsRepository.create({
      deviceId,
      expiresAt: refreshTokenResult.expiresAt,
      ip: context.ip,
      lastActiveAt: refreshTokenResult.issuedAt,
      title,
      tokenJti: refreshTokenResult.jti,
      userId,
    });

    return {
      accessToken,
      refreshExpiresAt: refreshTokenResult.expiresAt,
      refreshToken: refreshTokenResult.token,
    };
  }

  async logout({ deviceId, userId }: { deviceId: string; userId: number }): Promise<void> {
    await this.sessionsRepository.deleteByUserAndDevice({ deviceId, userId });
  }

  async refreshTokens(
    { deviceId, userId }: { deviceId: string; userId: number },
    context: LoginContext,
  ): Promise<RefreshResult> {
    const [accessToken, refreshTokenResult] = await Promise.all([
      signAccessToken({ userId }),
      signRefreshToken({ deviceId, userId }),
    ]);

    await this.sessionsRepository.rotateSession({
      deviceId,
      expiresAt: refreshTokenResult.expiresAt,
      ip: context.ip,
      lastActiveAt: refreshTokenResult.issuedAt,
      tokenJti: refreshTokenResult.jti,
      userId,
    });

    return {
      accessToken,
      refreshExpiresAt: refreshTokenResult.expiresAt,
      refreshToken: refreshTokenResult.token,
    };
  }

  async register(input: CreateUserInput): Promise<void> {
    const code = randomUUID();
    const expiresAt = addHours(new Date(), CONFIRMATION_TTL_HOURS);

    const user = await this.usersService.registerUser({
      ...input,
      emailConfirmation: { code, expiresAt, isConfirmed: false },
    });

    const confirmLink = `${env.frontendUrl}/confirm-registration?code=${code}`;
    const template = renderConfirmEmail({ confirmLink, login: user.login });

    try {
      await sendEmail({ ...template, to: user.email });
    } catch (err) {
      log.error({ err, userId: user.id }, "Failed to send confirmation email");
    }
  }

  async requestPasswordRecovery({ email }: PasswordRecoveryInput): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return;

    const now = new Date();
    const throttleCutoff = subSeconds(now, PASSWORD_RECOVERY_THROTTLE_SECONDS);
    const lastIssuedAt = user.passwordRecoveryExpiresAt
      ? subHours(user.passwordRecoveryExpiresAt, PASSWORD_RECOVERY_TTL_HOURS)
      : null;
    if (lastIssuedAt && isAfter(lastIssuedAt, throttleCutoff)) return;

    const code = randomUUID();
    const expiresAt = addHours(now, PASSWORD_RECOVERY_TTL_HOURS);
    const userId = user.id;
    await this.usersRepository.setPasswordRecovery({ code, expiresAt, userId });

    const recoveryLink = `${env.frontendUrl}/password-recovery?recoveryCode=${code}`;
    const template = renderPasswordRecoveryEmail({ recoveryLink });

    sendEmail({ ...template, to: user.email }).catch((err: unknown) => {
      log.error({ err, userId }, "Failed to send password recovery email");
    });
  }

  async resendConfirmationEmail({ email }: RegistrationEmailResendingInput): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new BadRequestError("Resend failed", {
        fields: [{ field: "email", message: "Email not found" }],
      });
    }

    if (user.emailIsConfirmed) {
      throw new BadRequestError("Resend failed", {
        fields: [{ field: "email", message: "Email is already confirmed" }],
      });
    }

    const code = randomUUID();
    const expiresAt = addHours(new Date(), CONFIRMATION_TTL_HOURS);

    await this.usersRepository.updateEmailConfirmation({
      code,
      expiresAt,
      isConfirmed: false,
      userId: user.id,
    });

    const confirmLink = `${env.frontendUrl}/confirm-registration?code=${code}`;
    const template = renderConfirmEmail({ confirmLink, login: user.login });

    try {
      await sendEmail({ ...template, to: user.email });
    } catch (err) {
      log.error({ err, userId: user.id }, "Failed to resend confirmation email");
      throw new HttpError(HTTP_STATUS.BAD_GATEWAY, "Failed to send confirmation email");
    }
  }
}

function formatNameVersion(name: string | undefined, version: string | undefined): string {
  if (!name) return "";
  return version ? `${name} ${version}` : name;
}

function parseDeviceTitle(userAgent: string | undefined): string {
  if (!userAgent || userAgent.trim().length === 0) return FALLBACK_DEVICE_TITLE;

  const result = new UAParser(userAgent).getResult();
  const browserPart = formatNameVersion(result.browser.name, result.browser.version);
  const osPart = formatNameVersion(result.os.name, result.os.version);

  if (!browserPart && !osPart) return FALLBACK_DEVICE_TITLE;
  if (!osPart) return browserPart;
  if (!browserPart) return osPart;
  return `${browserPart} on ${osPart}`;
}
