import { z } from "zod";

import { registerPaths } from "../../lib/openapi.js";

const deviceViewModelSchema = z.object({
  deviceId: z.string(),
  ip: z.string(),
  isCurrent: z.boolean(),
  lastActiveDate: z.iso.datetime(),
  title: z.string(),
});

const deviceIdParam = {
  in: "path" as const,
  name: "deviceId",
  required: true,
  schema: { type: "string" as const },
};

export function registerSecurityOpenApi(): void {
  registerPaths({
    "/api/security/devices": {
      delete: {
        operationId: "terminateOtherDevices",
        responses: {
          "204": { description: "All sessions except the current one were terminated" },
          "401": { description: "No valid refreshToken cookie" },
          "403": { description: "Missing or invalid Origin/Referer header" },
        },
        security: [{ cookieAuth: [] }],
        summary: "Terminate all other active sessions for current user",
        tags: ["Security"],
      },
      get: {
        operationId: "listActiveDevices",
        responses: {
          "200": {
            content: { "application/json": { schema: z.array(deviceViewModelSchema) } },
            description: "List of all active devices for the authenticated user",
          },
          "401": { description: "No valid refreshToken cookie" },
        },
        security: [{ cookieAuth: [] }],
        summary: "List all active devices for current user",
        tags: ["Security"],
      },
    },
    "/api/security/devices/{deviceId}": {
      delete: {
        operationId: "terminateDevice",
        parameters: [deviceIdParam],
        responses: {
          "204": { description: "Device session terminated" },
          "401": { description: "No valid refreshToken cookie" },
          "403": {
            description:
              "Missing or invalid Origin/Referer header, or attempting to terminate current session",
          },
          "404": { description: "Device not found" },
        },
        security: [{ cookieAuth: [] }],
        summary: "Terminate a specific device session by deviceId",
        tags: ["Security"],
      },
    },
  });
}
