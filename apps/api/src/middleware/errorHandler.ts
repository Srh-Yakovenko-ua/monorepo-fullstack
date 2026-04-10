import type { ApiError } from "@app/shared";
import type { ErrorRequestHandler } from "express";

import { ZodError } from "zod";

import { env } from "../config/env.js";
import { HttpError, ValidationError } from "../lib/errors.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("error-handler");
const isProduction = env.nodeEnv === "production";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = toHttpError(err);

  log[httpError.status >= 500 ? "error" : "warn"](
    {
      err: {
        message: httpError.message,
        name: httpError.name,
        stack: err instanceof Error ? err.stack : undefined,
      },
      requestId: req.requestId,
      status: httpError.status,
    },
    httpError.message,
  );

  const body: ApiError = {
    message: isProduction && httpError.status >= 500 ? "Internal server error" : httpError.message,
    ...(httpError.code !== undefined && { code: httpError.code }),
    ...(req.requestId !== undefined && { requestId: req.requestId }),
  };

  res.status(httpError.status).json(body);
};

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "_"}: ${issue.message}`).join("; ");
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof ZodError) return new ValidationError(formatZodError(err));
  if (err instanceof Error) return new HttpError(500, err.message);
  return new HttpError(500, "Unknown error");
}
