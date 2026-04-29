import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { NotFoundError } from "./lib/errors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRouter } from "./routes/auth.routes.js";
import { blogsRouter } from "./routes/blogs.routes.js";
import { commentsRouter } from "./routes/comments.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { postsRouter } from "./routes/posts.routes.js";
import { securityRouter } from "./routes/security.routes.js";
import { testingRouter } from "./routes/testing.routes.js";
import { usersRouter } from "./routes/users.routes.js";

export function applyTerminators(app: Express): void {
  app.use((req, _res, next) => {
    next(new NotFoundError(`Not found: ${req.method} ${req.path}`));
  });

  app.use(errorHandler);
}

export function buildExpressApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      credentials: true,
      origin: (origin, cb) => {
        if (!origin) {
          cb(null, true);
          return;
        }
        cb(null, env.corsOrigins.includes(origin));
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/blogs", blogsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/security/devices", securityRouter);
  app.use("/api/users", usersRouter);

  if (env.nodeEnv !== "production" || env.enableTestingEndpoints) {
    app.use("/api/testing", testingRouter);
  }

  if (env.enableSwagger) {
    app.use(
      "/api/docs",
      helmet.contentSecurityPolicy({
        directives: {
          connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        },
      }),
      docsRouter,
    );
  }

  return app;
}

export function createApp(): Express {
  const app = buildExpressApp();
  applyTerminators(app);
  return app;
}
