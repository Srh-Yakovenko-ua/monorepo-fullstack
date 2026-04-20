import type { ApiErrorResult } from "@app/shared";
import type { ZodError } from "zod";

export function fieldError(field: string, message: string): ApiErrorResult {
  return { errorsMessages: [{ field, message }] };
}

export function mapZodError(error: ZodError): ApiErrorResult {
  return {
    errorsMessages: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
