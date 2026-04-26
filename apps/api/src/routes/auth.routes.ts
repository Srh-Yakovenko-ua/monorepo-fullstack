import {
  CreateUserInputSchema,
  LoginInputSchema,
  NewPasswordInputSchema,
  PasswordRecoveryInputSchema,
  RegistrationConfirmationInputSchema,
  RegistrationEmailResendingInputSchema,
  USER_ROLES,
} from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  login,
  logout,
  me,
  newPassword,
  passwordRecovery,
  refreshToken,
  registration,
  registrationConfirmation,
  registrationEmailResending,
} from "../controllers/auth.controller.js";
import { apiErrorResultSchema, registerPaths } from "../lib/openapi.js";
import { authRateLimit } from "../middleware/auth-rate-limit.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRefreshSession } from "../middleware/require-refresh-session.js";
import { validateBody } from "../middleware/validate.js";

const router: Router = Router();

router.post("/login", authRateLimit, validateBody(LoginInputSchema), login);
router.post("/logout", requireRefreshSession, logout);
router.get("/me", requireAuth, me);
router.post("/refresh-token", requireRefreshSession, refreshToken);
router.post("/registration", authRateLimit, validateBody(CreateUserInputSchema), registration);
router.post(
  "/registration-confirmation",
  authRateLimit,
  validateBody(RegistrationConfirmationInputSchema),
  registrationConfirmation,
);
router.post(
  "/registration-email-resending",
  authRateLimit,
  validateBody(RegistrationEmailResendingInputSchema),
  registrationEmailResending,
);
router.post(
  "/password-recovery",
  authRateLimit,
  validateBody(PasswordRecoveryInputSchema),
  passwordRecovery,
);
router.post("/new-password", authRateLimit, validateBody(NewPasswordInputSchema), newPassword);

registerPaths({
  "/api/auth/login": {
    post: {
      operationId: "login",
      requestBody: {
        content: { "application/json": { schema: LoginInputSchema } },
        required: true,
      },
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: z.object({ accessToken: z.string() }),
            },
          },
          description:
            "Login successful. Returns accessToken in body and sets a refreshToken HttpOnly cookie.",
          headers: {
            "Set-Cookie": {
              description: "refreshToken=<token>; Path=/; HttpOnly; SameSite=Strict",
              schema: { type: "string" },
            },
          },
        },
        "400": { description: "Invalid request body" },
        "401": { description: "Invalid credentials" },
      },
      summary: "Log in with login/email and password",
      tags: ["Auth"],
    },
  },
  "/api/auth/logout": {
    post: {
      operationId: "logout",
      responses: {
        "204": { description: "Logged out. refreshToken cookie cleared." },
        "401": { description: "No valid refreshToken cookie" },
        "403": { description: "Missing or invalid Origin/Referer header" },
      },
      security: [{ cookieAuth: [] }],
      summary: "Revoke the current refreshToken and clear the cookie",
      tags: ["Auth"],
    },
  },
  "/api/auth/me": {
    get: {
      operationId: "me",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: z.object({
                email: z.string(),
                login: z.string(),
                role: z.enum(USER_ROLES),
                userId: z.string(),
              }),
            },
          },
          description: "Current user info",
        },
        "401": { description: "Unauthorized" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Get current authenticated user",
      tags: ["Auth"],
    },
  },
  "/api/auth/new-password": {
    post: {
      description:
        "Confirms a password recovery using the recoveryCode received by email and sets a new password. Recovery codes are single-use and expire in 1 hour.",
      operationId: "newPassword",
      requestBody: {
        content: { "application/json": { schema: NewPasswordInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Password updated successfully" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Invalid or expired recoveryCode, or invalid newPassword",
        },
        "429": { description: "Too many requests" },
      },
      summary: "Set a new password using a recovery code",
      tags: ["Auth"],
    },
  },
  "/api/auth/password-recovery": {
    post: {
      description:
        "Always responds with 204 to prevent email enumeration: the response is identical whether or not the email belongs to a registered user. If the email is registered, a recovery code is generated and a reset link is emailed.",
      operationId: "passwordRecovery",
      requestBody: {
        content: { "application/json": { schema: PasswordRecoveryInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Password recovery email sent (or silently ignored)" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Invalid email format",
        },
        "429": { description: "Too many requests" },
      },
      summary: "Request a password recovery email",
      tags: ["Auth"],
    },
  },
  "/api/auth/refresh-token": {
    post: {
      operationId: "refreshToken",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: z.object({ accessToken: z.string() }),
            },
          },
          description:
            "New access + refresh token pair issued. Previous refreshToken is revoked. New refreshToken set as HttpOnly cookie.",
          headers: {
            "Set-Cookie": {
              description: "refreshToken=<token>; Path=/; HttpOnly; SameSite=Strict",
              schema: { type: "string" },
            },
          },
        },
        "401": { description: "No valid refreshToken cookie or token is revoked/expired" },
        "403": { description: "Missing or invalid Origin/Referer header" },
      },
      security: [{ cookieAuth: [] }],
      summary: "Generate a new pair of access + refresh tokens",
      tags: ["Auth"],
    },
  },
  "/api/auth/registration": {
    post: {
      operationId: "registration",
      requestBody: {
        content: { "application/json": { schema: CreateUserInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Registration successful, confirmation email sent" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Validation error or login/email already taken",
        },
      },
      summary: "Register a new user (sends confirmation email)",
      tags: ["Auth"],
    },
  },
  "/api/auth/registration-confirmation": {
    post: {
      operationId: "registrationConfirmation",
      requestBody: {
        content: { "application/json": { schema: RegistrationConfirmationInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Email confirmed successfully" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Invalid, expired, or already-used confirmation code",
        },
      },
      summary: "Confirm email with a confirmation code",
      tags: ["Auth"],
    },
  },
  "/api/auth/registration-email-resending": {
    post: {
      operationId: "registrationEmailResending",
      requestBody: {
        content: { "application/json": { schema: RegistrationEmailResendingInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Confirmation email resent" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Email not found, already confirmed, or invalid format",
        },
      },
      summary: "Resend email confirmation code",
      tags: ["Auth"],
    },
  },
});

export const authRouter: Router = router;
