import type { ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

import { TooManyRequestsError } from "../exceptions/errors.js";

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected override throwThrottlingException(_context: ExecutionContext): Promise<void> {
    return Promise.reject(new TooManyRequestsError("Too many requests"));
  }
}
