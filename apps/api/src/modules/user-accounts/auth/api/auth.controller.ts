import type { LoginSuccessViewModel, MeViewModel } from "@app/shared";
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { differenceInMilliseconds } from "date-fns";

import { env } from "../../../../config/env.js";
import { UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { AuthThrottlerGuard } from "../../../../core/guards/auth-throttler.guard.js";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard.js";
import { RefreshSessionGuard } from "../../../../core/guards/refresh-session.guard.js";
import { createLogger } from "../../../../core/logger.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { AuthService } from "../application/auth.service.js";
import { CreateUserInputDto } from "./input-dto/create-user-input.dto.js";
import { LoginInputDto } from "./input-dto/login-input.dto.js";
import { NewPasswordInputDto } from "./input-dto/new-password-input.dto.js";
import { PasswordRecoveryInputDto } from "./input-dto/password-recovery-input.dto.js";
import { RegistrationConfirmationInputDto } from "./input-dto/registration-confirmation-input.dto.js";
import { RegistrationEmailResendingInputDto } from "./input-dto/registration-email-resending-input.dto.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";
const log = createLogger("auth.controller");

@ApiTags("Auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: LoginInputDto })
  @ApiOperation({ summary: "Log in with login/email and password" })
  @ApiResponse({
    description: "Login successful. Sets refreshToken HttpOnly cookie.",
    status: 200,
  })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Invalid credentials", status: 401 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @UseGuards(AuthThrottlerGuard)
  async login(
    @Body(new ZodBodyPipe(LoginInputSchema)) body: LoginInputDto,
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

  @ApiCookieAuth("refreshToken")
  @ApiOperation({ summary: "Revoke the current refreshToken and clear the cookie" })
  @ApiResponse({ description: "Logged out", status: 204 })
  @ApiResponse({ description: "No valid refreshToken cookie", status: 401 })
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

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiResponse({ description: "Current user info", status: 200 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: Request): Promise<MeViewModel> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.authService.getCurrentUser(user.userId);
  }

  @ApiBody({ type: NewPasswordInputDto })
  @ApiOperation({ summary: "Set a new password using a recovery code" })
  @ApiResponse({ description: "Password updated successfully", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("new-password")
  @UseGuards(AuthThrottlerGuard)
  newPassword(
    @Body(new ZodBodyPipe(NewPasswordInputSchema)) body: NewPasswordInputDto,
  ): Promise<void> {
    return this.authService.confirmPasswordRecovery(body);
  }

  @ApiBody({ type: PasswordRecoveryInputDto })
  @ApiOperation({ summary: "Request a password recovery email" })
  @ApiResponse({ description: "Recovery email dispatched (or silently ignored)", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("password-recovery")
  @UseGuards(AuthThrottlerGuard)
  passwordRecovery(
    @Body(new ZodBodyPipe(PasswordRecoveryInputSchema)) body: PasswordRecoveryInputDto,
  ): void {
    this.authService.requestPasswordRecovery(body).catch((err: unknown) => {
      log.error({ err }, "Password recovery request failed");
    });
  }

  @ApiCookieAuth("refreshToken")
  @ApiOperation({ summary: "Generate a new pair of access + refresh tokens" })
  @ApiResponse({ description: "New tokens issued, refreshToken cookie rotated", status: 200 })
  @ApiResponse({ description: "Refresh token invalid, revoked or expired", status: 401 })
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

  @ApiBody({ type: CreateUserInputDto })
  @ApiOperation({ summary: "Register a new user (sends confirmation email)" })
  @ApiResponse({ description: "Registration successful, confirmation email sent", status: 204 })
  @ApiResponse({ description: "Validation failed or login/email already taken", status: 400 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration")
  @UseGuards(AuthThrottlerGuard)
  registration(
    @Body(new ZodBodyPipe(CreateUserInputSchema)) body: CreateUserInputDto,
  ): Promise<void> {
    return this.authService.register(body);
  }

  @ApiBody({ type: RegistrationConfirmationInputDto })
  @ApiOperation({ summary: "Confirm email with a confirmation code" })
  @ApiResponse({ description: "Email confirmed successfully", status: 204 })
  @ApiResponse({ description: "Invalid, expired or already-used confirmation code", status: 400 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration-confirmation")
  @UseGuards(AuthThrottlerGuard)
  registrationConfirmation(
    @Body(new ZodBodyPipe(RegistrationConfirmationInputSchema))
    body: RegistrationConfirmationInputDto,
  ): Promise<void> {
    return this.authService.confirmRegistration(body);
  }

  @ApiBody({ type: RegistrationEmailResendingInputDto })
  @ApiOperation({ summary: "Resend email confirmation code" })
  @ApiResponse({ description: "Confirmation email resent", status: 204 })
  @ApiResponse({ description: "Email not found, already confirmed or invalid format", status: 400 })
  @ApiResponse({ description: "Too many requests", status: 429 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("registration-email-resending")
  @UseGuards(AuthThrottlerGuard)
  registrationEmailResending(
    @Body(new ZodBodyPipe(RegistrationEmailResendingInputSchema))
    body: RegistrationEmailResendingInputDto,
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
