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

export class NotFoundError extends HttpError {
  constructor(message = "Not found", code?: string) {
    super(HTTP_STATUS.NOT_FOUND, message, code);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, code?: string) {
    super(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, code);
    this.name = "ValidationError";
  }
}
