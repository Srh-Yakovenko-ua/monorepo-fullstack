import type { DeviceViewModel } from "@app/shared";
import type { Request } from "express";

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";

import { UnauthorizedError } from "../../lib/errors.js";
import { RefreshSessionGuard } from "../../lib/guards/refresh-session.guard.js";
import { SecurityService } from "./security.service.js";

@Controller("api/security/devices")
@UseGuards(RefreshSessionGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get()
  listActiveDevices(@Req() request: Request): Promise<DeviceViewModel[]> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();
    return this.securityService.getActiveDevices({
      currentDeviceId: session.deviceId,
      userId: session.userId,
    });
  }

  @Delete(":deviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  terminateDevice(@Param("deviceId") deviceId: string, @Req() request: Request): Promise<void> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();
    return this.securityService.terminateDeviceById({
      currentDeviceId: session.deviceId,
      targetDeviceId: deviceId,
      userId: session.userId,
    });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  terminateOtherDevices(@Req() request: Request): Promise<void> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();
    return this.securityService.terminateOtherDevices({
      currentDeviceId: session.deviceId,
      userId: session.userId,
    });
  }
}
