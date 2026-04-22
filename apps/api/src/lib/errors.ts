import type { FieldError } from "@app/shared";

import { HTTP_STATUS, type HttpStatus } from "./http-status.js";

export class HttpError extends Error {
  readonly code?: string;
  readonly status: HttpStatus;

  constructor(status: HttpStatus, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export class BadRequestError extends HttpError {
  readonly fields?: FieldError[];

  constructor(message: string, options?: { code?: string; fields?: FieldError[] }) {
    super(HTTP_STATUS.BAD_REQUEST, message, options?.code);
    this.name = "BadRequestError";
    this.fields = options?.fields;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", code?: string) {
    super(HTTP_STATUS.NOT_FOUND, message, code);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", code?: string) {
    super(HTTP_STATUS.UNAUTHORIZED, message, code);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, code?: string) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, code);
    this.name = "ValidationError";
  }
}
