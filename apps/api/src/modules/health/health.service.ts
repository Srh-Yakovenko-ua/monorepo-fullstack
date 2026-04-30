import type { ApiHealth } from "@app/shared";

import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealth(): ApiHealth {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
