import { z } from "zod";

import { registerPaths } from "../../lib/openapi.js";

export function registerHealthOpenApi(): void {
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
}
