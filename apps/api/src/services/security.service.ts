import type { DeviceViewModel } from "@app/shared";

import type { SessionDoc } from "../db/models/session.model.js";

import * as sessionsRepository from "../db/repositories/sessions.repository.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";

export async function getActiveDevices({
  currentDeviceId,
  userId,
}: {
  currentDeviceId: string;
  userId: string;
}): Promise<DeviceViewModel[]> {
  const sessions = await sessionsRepository.findAllByUser(userId);
  return sessions.map((doc) => toDeviceView(doc, currentDeviceId));
}

export async function terminateDeviceById({
  currentDeviceId,
  targetDeviceId,
  userId,
}: {
  currentDeviceId: string;
  targetDeviceId: string;
  userId: string;
}): Promise<void> {
  if (targetDeviceId === currentDeviceId) {
    throw new ForbiddenError("Cannot terminate current session, use sign-out instead");
  }

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

export function toDeviceView(doc: SessionDoc, currentDeviceId: string): DeviceViewModel {
  return {
    deviceId: doc.deviceId,
    ip: doc.ip,
    isCurrent: doc.deviceId === currentDeviceId,
    lastActiveDate: doc.lastActiveAt.toISOString(),
    title: doc.title,
  };
}
