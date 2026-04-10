export class HttpError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", code?: string) {
    super(404, message, code);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, code?: string) {
    super(422, message, code);
    this.name = "ValidationError";
  }
}
