import type {
  CreateUserInput,
  LoginInput,
  LoginSuccessViewModel,
  MeViewModel,
  NewPasswordInput,
  PasswordRecoveryInput,
  RegistrationConfirmationInput,
  RegistrationEmailResendingInput,
} from "@app/shared";
import type { CookieOptions, Request, Response } from "express";

import {
  CreateUserInputSchema,
  LoginInputSchema,
  NewPasswordInputSchema,
  PasswordRecoveryInputSchema,
  RegistrationConfirmationInputSchema,
  RegistrationEmailResendingInputSchema,
} from "@app/shared";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { differenceInMilliseconds } from "date-fns";

import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { AuthRateLimitGuard } from "../../lib/guards/auth-rate-limit.guard.js";
import { JwtAuthGuard } from "../../lib/guards/jwt-auth.guard.js";
import { RefreshSessionGuard } from "../../lib/guards/refresh-session.guard.js";
import { createLogger } from "../../lib/logger.js";
import { ZodBodyPipe } from "../../lib/pipes/zod-body.pipe.js";
import { AuthService } from "./auth.service.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const log = createLogger("auth.controller");

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post("login")
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body(new ZodBodyPipe(LoginInputSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginSuccessViewModel> {
    const { accessToken, refreshExpiresAt, refreshToken } = await this.authService.login(body, {
      ip: request.ip ?? "",
      userAgent: request.headers["user-agent"],
    });
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      buildRefreshCookieOptions(differenceInMilliseconds(refreshExpiresAt, new Date())),
    );
    return { accessToken };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  @UseGuards(RefreshSessionGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();

    await this.authService.logout({ deviceId: session.deviceId, userId: session.userId });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request): Promise<MeViewModel> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.authService.getCurrentUser(user.userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("new-password")
  @UseGuards(AuthRateLimitGuard)
  newPassword(
    @Body(new ZodBodyPipe(NewPasswordInputSchema)) body: NewPasswordInput,
  ): Promise<void> {
    return this.authService.confirmPasswordRecovery(body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("password-recovery")
  @UseGuards(AuthRateLimitGuard)
  passwordRecovery(
    @Body(new ZodBodyPipe(PasswordRecoveryInputSchema)) body: PasswordRecoveryInput,
  ): void {
    this.authService.requestPasswordRecovery(body).catch((err: unknown) => {
      log.error({ err }, "Password recovery request failed");
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post("refresh-token")
  @UseGuards(RefreshSessionGuard)
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginSuccessViewModel> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();

    const {
      accessToken,
      refreshExpiresAt,
      refreshToken: newRefreshToken,
    } = await this.authService.refreshTokens(
      { deviceId: session.deviceId, userId: session.userId },
      { ip: request.ip ?? "", userAgent: request.headers["user-agent"] },
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      newRefreshToken,
      buildRefreshCookieOptions(differenceInMilliseconds(refreshExpiresAt, new Date())),
    );
    return { accessToken };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration")
  @UseGuards(AuthRateLimitGuard)
  registration(@Body(new ZodBodyPipe(CreateUserInputSchema)) body: CreateUserInput): Promise<void> {
    return this.authService.register(body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration-confirmation")
  @UseGuards(AuthRateLimitGuard)
  registrationConfirmation(
    @Body(new ZodBodyPipe(RegistrationConfirmationInputSchema))
    body: RegistrationConfirmationInput,
  ): Promise<void> {
    return this.authService.confirmRegistration(body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration-email-resending")
  @UseGuards(AuthRateLimitGuard)
  registrationEmailResending(
    @Body(new ZodBodyPipe(RegistrationEmailResendingInputSchema))
    body: RegistrationEmailResendingInput,
  ): Promise<void> {
    return this.authService.resendConfirmationEmail(body);
  }
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
