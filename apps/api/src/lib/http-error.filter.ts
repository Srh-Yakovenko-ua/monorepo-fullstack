import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { NextFunction } from "express";

import { Catch } from "@nestjs/common";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const next = ctx.getNext<NextFunction>();
    next(exception);
  }
}
