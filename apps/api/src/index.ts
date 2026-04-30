import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { type NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import * as postsRepository from "./db/repositories/posts.repository.js";
import * as usersRepository from "./db/repositories/users.repository.js";
import { HttpErrorFilter } from "./lib/http-error.filter.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("startup");
const SHUTDOWN_TIMEOUT_MS = 10_000;
const JSON_BODY_LIMIT = "1mb";

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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: false,
  });

  app.disable("x-powered-by");
  app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, env.corsOrigins.includes(origin));
    },
  });
  app.use(cookieParser());
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useGlobalFilters(new HttpErrorFilter());

  await app.listen(env.port);
  log.info({ port: env.port }, `api listening on http://localhost:${env.port}`);

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
      await app.close();
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
  const backfilledRoleCount = await usersRepository.backfillMissingRole();
  if (backfilledRoleCount > 0) {
    log.info({ count: backfilledRoleCount }, "backfilled missing role field on users");
  }

  const backfilledLikeCounterCount = await postsRepository.backfillMissingLikeCounters();
  if (backfilledLikeCounterCount > 0) {
    log.info(
      { count: backfilledLikeCounterCount },
      "backfilled missing like/dislike counters on posts",
    );
  }
}

void main();
