import { Router } from "express";
import { z } from "zod";

import {
  listActiveDevices,
  terminateDevice,
  terminateOtherDevices,
} from "../controllers/security.controller.js";
import { registerPaths } from "../lib/openapi.js";
import { requireRefreshSession } from "../middleware/require-refresh-session.js";

const router: Router = Router();

router.get("/", requireRefreshSession, listActiveDevices);
router.delete("/", requireRefreshSession, terminateOtherDevices);
router.delete("/:deviceId", requireRefreshSession, terminateDevice);

const deviceViewModelSchema = z.object({
  deviceId: z.string(),
  ip: z.string(),
  lastActiveDate: z.iso.datetime(),
  title: z.string(),
});

const deviceIdParam = {
  in: "path" as const,
  name: "deviceId",
  required: true,
  schema: { type: "string" as const },
};

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
        "403": { description: "Missing or invalid Origin/Referer header" },
        "404": { description: "Device not found" },
      },
      security: [{ cookieAuth: [] }],
      summary: "Terminate a specific device session by deviceId",
      tags: ["Security"],
    },
  },
});

export const securityRouter: Router = router;
