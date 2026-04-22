import { LoginInputSchema } from "@app/shared";
import { Router } from "express";

import { login } from "../controllers/auth.controller.js";
import { registerPaths } from "../lib/openapi.js";
import { validateBody } from "../middleware/validate.js";

const router: Router = Router();

router.post("/login", validateBody(LoginInputSchema), login);

registerPaths({
  "/api/auth/login": {
    post: {
      operationId: "login",
      requestBody: {
        content: { "application/json": { schema: LoginInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Credentials valid" },
        "400": { description: "Invalid request body" },
        "401": { description: "Invalid credentials" },
      },
      summary: "Log in with login/email and password",
      tags: ["Auth"],
    },
  },
});

export const authRouter: Router = router;
