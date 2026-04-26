import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import * as usersRepository from "./db/repositories/users.repository.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("startup");

async function main(): Promise<void> {
  let mongoConnected = false;

  try {
    await connectMongo();
    mongoConnected = true;
  } catch (err) {
    log.warn({ err }, "mongo connection failed, starting API without DB");
  }

  if (mongoConnected) {
    try {
      await runStartupTasks();
    } catch (err) {
      log.warn({ err }, "startup tasks failed, continuing");
    }
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    log.info({ port: env.port }, `api listening on http://localhost:${env.port}`);
  });

  const SHUTDOWN_TIMEOUT_MS = 10_000;
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log.info({ signal }, "shutting down");

    const forceExit = setTimeout(() => {
      log.error("graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await disconnectMongo().catch(() => {});
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      log.error({ err }, "error during shutdown");
      clearTimeout(forceExit);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

async function runStartupTasks(): Promise<void> {
  const backfilledCount = await usersRepository.backfillMissingRole();
  if (backfilledCount > 0) {
    log.info({ count: backfilledCount }, "backfilled missing role field on users");
  }
}

void main();
