import "express-async-errors";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("startup");

async function main(): Promise<void> {
  try {
    await connectMongo();
  } catch (err) {
    log.warn({ err }, "mongo connection failed, starting API without DB");
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    log.info({ port: env.port }, `api listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "shutting down");
    server.close();
    await disconnectMongo().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
