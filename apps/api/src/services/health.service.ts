import type { ApiHealth } from "@app/shared";

export function getHealth(): ApiHealth {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
