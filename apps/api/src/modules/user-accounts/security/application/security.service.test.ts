import { describe, expect, it, vi } from "vitest";

import type { SessionDoc } from "../domain/session.entity.js";

import { ForbiddenError, NotFoundError } from "../../../../core/exceptions/errors.js";
import { SessionsRepository } from "../infrastructure/sessions.repository.js";
import { SecurityService } from "./security.service.js";

type MockedSessionsRepository = {
  clearAll: ReturnType<typeof vi.fn>;
  deleteAllByUserExceptDevice: ReturnType<typeof vi.fn>;
  deleteByUserAndDevice: ReturnType<typeof vi.fn>;
  findAllByUser: ReturnType<typeof vi.fn>;
  findByDeviceId: ReturnType<typeof vi.fn>;
};

function buildService(sessionsRepository: MockedSessionsRepository = buildSessionsRepository()): {
  service: SecurityService;
  sessionsRepository: MockedSessionsRepository;
} {
  const service = new SecurityService(sessionsRepository as unknown as SessionsRepository);
  return { service, sessionsRepository };
}

function buildSessionDoc(overrides: Partial<SessionDoc> = {}): SessionDoc {
  return {
    deviceId: "device-1",
    expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    id: 1,
    ip: "127.0.0.1",
    lastActiveAt: new Date("2026-05-18T00:00:00.000Z"),
    title: "Chrome on macOS",
    tokenJti: "jti-1",
    userId: 1,
    ...overrides,
  };
}

function buildSessionsRepository(): MockedSessionsRepository {
  return {
    clearAll: vi.fn().mockResolvedValue(undefined),
    deleteAllByUserExceptDevice: vi.fn().mockResolvedValue(undefined),
    deleteByUserAndDevice: vi.fn().mockResolvedValue(true),
    findAllByUser: vi.fn().mockResolvedValue([]),
    findByDeviceId: vi.fn().mockResolvedValue(null),
  };
}

describe("SecurityService", () => {
  describe("getActiveDevices", () => {
    it("returns devices mapped from sessions with the current device flagged", async () => {
      const sessionsRepository = buildSessionsRepository();
      sessionsRepository.findAllByUser.mockResolvedValue([
        buildSessionDoc({ deviceId: "device-A", title: "Chrome on macOS" }),
        buildSessionDoc({ deviceId: "device-B", title: "Safari on iOS" }),
      ]);

      const { service } = buildService(sessionsRepository);

      const devices = await service.getActiveDevices({ currentDeviceId: "device-A", userId: 1 });

      expect(sessionsRepository.findAllByUser).toHaveBeenCalledWith(1);
      expect(devices).toEqual([
        {
          deviceId: "device-A",
          ip: "127.0.0.1",
          isCurrent: true,
          lastActiveDate: "2026-05-18T00:00:00.000Z",
          title: "Chrome on macOS",
        },
        {
          deviceId: "device-B",
          ip: "127.0.0.1",
          isCurrent: false,
          lastActiveDate: "2026-05-18T00:00:00.000Z",
          title: "Safari on iOS",
        },
      ]);
    });

    it("returns an empty array when the user has no sessions", async () => {
      const sessionsRepository = buildSessionsRepository();
      sessionsRepository.findAllByUser.mockResolvedValue([]);

      const { service } = buildService(sessionsRepository);

      const devices = await service.getActiveDevices({ currentDeviceId: "device-A", userId: 1 });

      expect(devices).toEqual([]);
    });
  });

  describe("terminateOtherDevices", () => {
    it("delegates to the repository with the current device and user id", async () => {
      const sessionsRepository = buildSessionsRepository();
      const { service } = buildService(sessionsRepository);

      await service.terminateOtherDevices({ currentDeviceId: "device-A", userId: 42 });

      expect(sessionsRepository.deleteAllByUserExceptDevice).toHaveBeenCalledWith({
        currentDeviceId: "device-A",
        userId: 42,
      });
    });
  });

  describe("terminateDeviceById", () => {
    it("deletes the target session when it belongs to the requesting user", async () => {
      const sessionsRepository = buildSessionsRepository();
      sessionsRepository.findByDeviceId.mockResolvedValue(
        buildSessionDoc({ deviceId: "device-B", userId: 7 }),
      );

      const { service } = buildService(sessionsRepository);

      await service.terminateDeviceById({
        currentDeviceId: "device-A",
        targetDeviceId: "device-B",
        userId: 7,
      });

      expect(sessionsRepository.deleteByUserAndDevice).toHaveBeenCalledWith({
        deviceId: "device-B",
        userId: 7,
      });
    });

    it("throws ForbiddenError when the target is the current device", async () => {
      const sessionsRepository = buildSessionsRepository();
      const { service } = buildService(sessionsRepository);

      const promise = service.terminateDeviceById({
        currentDeviceId: "device-A",
        targetDeviceId: "device-A",
        userId: 1,
      });

      await expect(promise).rejects.toBeInstanceOf(ForbiddenError);
      expect(sessionsRepository.findByDeviceId).not.toHaveBeenCalled();
      expect(sessionsRepository.deleteByUserAndDevice).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when no session matches the target device id", async () => {
      const sessionsRepository = buildSessionsRepository();
      sessionsRepository.findByDeviceId.mockResolvedValue(null);

      const { service } = buildService(sessionsRepository);

      const promise = service.terminateDeviceById({
        currentDeviceId: "device-A",
        targetDeviceId: "device-X",
        userId: 1,
      });

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      expect(sessionsRepository.deleteByUserAndDevice).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the target session belongs to a different user", async () => {
      const sessionsRepository = buildSessionsRepository();
      sessionsRepository.findByDeviceId.mockResolvedValue(
        buildSessionDoc({ deviceId: "device-B", userId: 99 }),
      );

      const { service } = buildService(sessionsRepository);

      const promise = service.terminateDeviceById({
        currentDeviceId: "device-A",
        targetDeviceId: "device-B",
        userId: 1,
      });

      await expect(promise).rejects.toBeInstanceOf(NotFoundError);
      expect(sessionsRepository.deleteByUserAndDevice).not.toHaveBeenCalled();
    });
  });

  describe("clearAllSessions", () => {
    it("delegates to the repository clearAll method", async () => {
      const sessionsRepository = buildSessionsRepository();
      const { service } = buildService(sessionsRepository);

      await service.clearAllSessions();

      expect(sessionsRepository.clearAll).toHaveBeenCalledTimes(1);
    });
  });
});
