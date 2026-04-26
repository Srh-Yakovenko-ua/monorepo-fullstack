import type { DeviceViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { UnauthorizedError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import * as securityService from "../services/security.service.js";

type DeviceIdParams = { deviceId: string };

export async function listActiveDevices(
  req: Request,
  res: Response<DeviceViewModel[]>,
): Promise<void> {
  const session = req.session;
  if (!session) throw new UnauthorizedError();

  const devices = await securityService.getActiveDevices({
    currentDeviceId: session.deviceId,
    userId: session.userId,
  });
  res.status(HTTP_STATUS.OK).json(devices);
}

export async function terminateDevice(
  req: Request<DeviceIdParams>,
  res: Response<void>,
): Promise<void> {
  const session = req.session;
  if (!session) throw new UnauthorizedError();

  await securityService.terminateDeviceById({
    currentDeviceId: session.deviceId,
    targetDeviceId: req.params.deviceId,
    userId: session.userId,
  });
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function terminateOtherDevices(req: Request, res: Response<void>): Promise<void> {
  const session = req.session;
  if (!session) throw new UnauthorizedError();

  await securityService.terminateOtherDevices({
    currentDeviceId: session.deviceId,
    userId: session.userId,
  });
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
