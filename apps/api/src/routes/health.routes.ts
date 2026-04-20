import { Router } from "express";
import { z } from "zod";

import { healthController } from "../controllers/health.controller.js";
import { registerPaths } from "../lib/openapi.js";

const router: Router = Router();

router.get("/", healthController);

registerPaths({
  "/api/health": {
    get: {
      operationId: "getHealth",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: z.object({
                status: z.enum(["ok", "degraded", "down"]),
                timestamp: z.string().meta({ description: "ISO 8601 timestamp" }),
                uptimeSeconds: z.number().int().nonnegative(),
              }),
            },
          },
          description: "Service is healthy",
        },
      },
      summary: "Health check",
      tags: ["System"],
    },
  },
});

export const healthRouter: Router = router;
