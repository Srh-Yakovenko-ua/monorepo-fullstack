import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { NotFoundError } from "./lib/errors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { healthRouter } from "./routes/health.routes.js";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);

  app.use((req, _res, next) => {
    next(new NotFoundError(`Not found: ${req.method} ${req.path}`));
  });

  app.use(errorHandler);

  return app;
}
