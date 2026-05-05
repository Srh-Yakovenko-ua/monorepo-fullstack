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
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { RefreshSessionGuard } from "../../../../core/guards/refresh-session.guard.js";
import { SecurityService } from "../application/security.service.js";

@ApiCookieAuth("refreshToken")
@ApiTags("Security")
@Controller("api/security/devices")
@UseGuards(RefreshSessionGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @ApiOperation({ summary: "List active devices for the current user" })
  @ApiResponse({ description: "List of active devices", status: 200 })
  @ApiResponse({ description: "No valid refreshToken cookie", status: 401 })
  @Get()
  listActiveDevices(@Req() request: Request): Promise<DeviceViewModel[]> {
    const session = request.session;
    if (!session) throw new UnauthorizedError();
    return this.securityService.getActiveDevices({
      currentDeviceId: session.deviceId,
      userId: session.userId,
    });
  }

  @ApiOperation({ summary: "Terminate a specific device session" })
  @ApiParam({ name: "deviceId" })
  @ApiResponse({ description: "Device terminated", status: 204 })
  @ApiResponse({ description: "No valid refreshToken cookie", status: 401 })
  @ApiResponse({ description: "Forbidden — device belongs to a different user", status: 403 })
  @ApiResponse({ description: "Device not found", status: 404 })
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

  @ApiOperation({ summary: "Terminate all device sessions except the current one" })
  @ApiResponse({ description: "Other devices terminated", status: 204 })
  @ApiResponse({ description: "No valid refreshToken cookie", status: 401 })
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
