import type { Request, RequestHandler } from "express";
import type { z, ZodType } from "zod";

import { BadRequestError } from "../lib/errors.js";
import { mapZodError } from "../lib/zod-error.js";

export function validateBody<Schema extends ZodType>(schema: Schema): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new BadRequestError("Invalid request body", {
          fields: mapZodError(parsed.error).errorsMessages,
        }),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validatedQuery<Schema extends ZodType>(
  req: Request,
  _schema: Schema,
): z.infer<Schema> {
  return req.validatedQuery as z.infer<Schema>;
}

export function validateQuery<Schema extends ZodType>(schema: Schema): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(
        new BadRequestError("Invalid query params", {
          fields: mapZodError(parsed.error).errorsMessages,
        }),
      );
      return;
    }
    req.validatedQuery = parsed.data;
    next();
  };
}
