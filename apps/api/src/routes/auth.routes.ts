import {
  CreateUserInputSchema,
  LoginInputSchema,
  RegistrationConfirmationInputSchema,
  RegistrationEmailResendingInputSchema,
} from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  login,
  me,
  registration,
  registrationConfirmation,
  registrationEmailResending,
} from "../controllers/auth.controller.js";
import { apiErrorResultSchema, registerPaths } from "../lib/openapi.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate.js";

const router: Router = Router();

router.post("/login", validateBody(LoginInputSchema), login);
router.get("/me", requireAuth, me);
router.post("/registration", validateBody(CreateUserInputSchema), registration);
router.post(
  "/registration-confirmation",
  validateBody(RegistrationConfirmationInputSchema),
  registrationConfirmation,
);
router.post(
  "/registration-email-resending",
  validateBody(RegistrationEmailResendingInputSchema),
  registrationEmailResending,
);

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
          description: "Login successful",
        },
        "400": { description: "Invalid request body" },
        "401": { description: "Invalid credentials" },
      },
      summary: "Log in with login/email and password",
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
