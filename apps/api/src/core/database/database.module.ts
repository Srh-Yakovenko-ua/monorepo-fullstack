import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";

import { env } from "../../config/env.js";
import { POSTGRES_POOL } from "./postgres-pool.token.js";

@Global()
@Module({
  exports: [POSTGRES_POOL],
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: (): Pool => new Pool({ connectionString: env.databaseUrl }),
    },
  ],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
