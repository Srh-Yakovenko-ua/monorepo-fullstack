import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { ROLE } from "@app/shared";
import { Injectable } from "@nestjs/common";

import { ForbiddenError, UnauthorizedError } from "../errors.js";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) throw new UnauthorizedError();
    if (request.user.role !== ROLE.superAdmin) throw new ForbiddenError();
    return true;
  }
}
