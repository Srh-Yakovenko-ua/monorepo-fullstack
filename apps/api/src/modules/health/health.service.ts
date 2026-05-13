import type { ApiHealth } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../core/database/postgres-pool.token.js";

const PG_HEALTHCHECK_TIMEOUT_MS = 1000;

@Injectable()
export class HealthService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async getHealth(): Promise<ApiHealth> {
    const postgres = await this.pingPostgres();
    return {
      postgres,
      status: postgres === "ok" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  private async pingPostgres(): Promise<"down" | "ok"> {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const queryPromise = this.pool.query("SELECT 1");
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("postgres healthcheck timeout")),
          PG_HEALTHCHECK_TIMEOUT_MS,
        );
      });
      await Promise.race([queryPromise, timeoutPromise]);
      return "ok";
    } catch {
      return "down";
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
