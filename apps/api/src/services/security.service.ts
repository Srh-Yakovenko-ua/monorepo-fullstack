import type { DeviceViewModel } from "@app/shared";

import type { SessionDoc } from "../db/models/session.model.js";

import * as sessionsRepository from "../db/repositories/sessions.repository.js";
import { NotFoundError } from "../lib/errors.js";

export async function getActiveDevices(userId: string): Promise<DeviceViewModel[]> {
  const sessions = await sessionsRepository.findAllByUser(userId);
  return sessions.map(toDeviceView);
}

export async function terminateDeviceById({
  targetDeviceId,
  userId,
}: {
  targetDeviceId: string;
  userId: string;
}): Promise<void> {
  const session = await sessionsRepository.findByDeviceId(targetDeviceId);
  if (!session || session.userId.toHexString() !== userId) {
    throw new NotFoundError(`Device ${targetDeviceId} not found`);
  }

  await sessionsRepository.deleteByUserAndDevice({ deviceId: targetDeviceId, userId });
}

export async function terminateOtherDevices({
  currentDeviceId,
  userId,
}: {
  currentDeviceId: string;
  userId: string;
}): Promise<void> {
  await sessionsRepository.deleteAllByUserExceptDevice({ currentDeviceId, userId });
}

export function toDeviceView(doc: SessionDoc): DeviceViewModel {
  return {
    deviceId: doc.deviceId,
    ip: doc.ip,
    lastActiveDate: doc.lastActiveAt.toISOString(),
    title: doc.title,
  };
}
