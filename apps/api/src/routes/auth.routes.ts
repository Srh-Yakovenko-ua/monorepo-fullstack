import { LoginInputSchema } from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import { login, me } from "../controllers/auth.controller.js";
import { registerPaths } from "../lib/openapi.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody } from "../middleware/validate.js";

const router: Router = Router();

router.post("/login", validateBody(LoginInputSchema), login);
router.get("/me", requireAuth, me);

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
});

export const authRouter: Router = router;
