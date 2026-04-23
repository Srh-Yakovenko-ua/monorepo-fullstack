import type { ApiError, ApiErrorResult } from "@app/shared";
import type { ErrorRequestHandler } from "express";

import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { BadRequestError, HttpError, NotFoundError, ValidationError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("error-handler");
const isProduction = env.nodeEnv === "production";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = toHttpError(err);

  log[httpError.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR ? "error" : "warn"](
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

  if (httpError instanceof BadRequestError && httpError.fields && httpError.fields.length > 0) {
    const fieldBody: ApiErrorResult = { errorsMessages: httpError.fields };
    res.status(httpError.status).json(fieldBody);
    return;
  }

  if (httpError.bodyless) {
    res.status(httpError.status).end();
    return;
  }

  const body: ApiError = {
    message:
      isProduction && httpError.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
        ? "Internal server error"
        : httpError.message,
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
  if (err instanceof MongooseError.CastError) return new NotFoundError("Resource not found");
  if (err instanceof Error) return new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, err.message);
  return new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unknown error");
}
