import type { DeviceViewModel } from "@app/shared";

import { Injectable } from "@nestjs/common";

import type { SessionDoc } from "../domain/session.entity.js";

import { ForbiddenError, NotFoundError } from "../../../../core/exceptions/errors.js";
import { SessionsRepository } from "../infrastructure/sessions.repository.js";

@Injectable()
export class SecurityService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async clearAllSessions(): Promise<void> {
    await this.sessionsRepository.clearAll();
  }

  async getActiveDevices({
    currentDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    userId: number;
  }): Promise<DeviceViewModel[]> {
    const sessions = await this.sessionsRepository.findAllByUser(userId);
    return sessions.map((doc) => toDeviceView(doc, currentDeviceId));
  }

  async terminateDeviceById({
    currentDeviceId,
    targetDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    targetDeviceId: string;
    userId: number;
  }): Promise<void> {
    if (targetDeviceId === currentDeviceId) {
      throw new ForbiddenError("Cannot terminate current session, use sign-out instead");
    }

    const session = await this.sessionsRepository.findByDeviceId(targetDeviceId);
    if (!session || session.userId !== userId) {
      throw new NotFoundError(`Device ${targetDeviceId} not found`);
    }

    await this.sessionsRepository.deleteByUserAndDevice({ deviceId: targetDeviceId, userId });
  }

  async terminateOtherDevices({
    currentDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    userId: number;
  }): Promise<void> {
    await this.sessionsRepository.deleteAllByUserExceptDevice({ currentDeviceId, userId });
  }
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
