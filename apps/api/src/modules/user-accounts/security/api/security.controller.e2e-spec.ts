import type { DeviceViewModel } from "@app/shared";
import type { INestApplication } from "@nestjs/common";

import { getRepositoryToken } from "@nestjs/typeorm";
import { addDays } from "date-fns";
import request from "supertest";
import { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { signRefreshToken } from "../../../../core/jwt.js";
import { createTestApp } from "../../../../test/create-test-app.js";
import { truncateAllTables } from "../../../../test/truncate.js";
import { UserAccountsModule } from "../../user-accounts.module.js";
import { UsersService } from "../../users/application/users.service.js";
import { SessionEntity } from "../domain/session.entity.js";
import { SessionsRepository } from "../infrastructure/sessions.repository.js";

const ALLOWED_ORIGIN = "http://localhost:5173";
const REFRESH_SESSION_TTL_DAYS = 30;

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let sessionRepo: Repository<SessionEntity>;
let usersService: UsersService;
let sessionsRepository: SessionsRepository;

type CreatedSession = {
  deviceId: string;
  refreshCookie: string;
};

async function createConfirmedUser(
  email: string,
  login: string,
): Promise<{ id: number; login: string }> {
  const user = await usersService.createUser({
    email,
    login,
    password: "Pa55word!",
  });
  return { id: Number(user.id), login: user.login };
}

async function createSessionFor({
  ip = "127.0.0.1",
  title = "Test device",
  userId,
}: {
  ip?: string;
  title?: string;
  userId: number;
}): Promise<CreatedSession> {
  const deviceId = `device-${userId}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const { expiresAt, issuedAt, jti, token } = await signRefreshToken({ deviceId, userId });
  await sessionsRepository.create({
    deviceId,
    expiresAt,
    ip,
    lastActiveAt: issuedAt,
    title,
    tokenJti: jti,
    userId,
  });
  return { deviceId, refreshCookie: `refreshToken=${token}` };
}

async function getDevices(refreshCookie: string): Promise<DeviceViewModel[]> {
  const res = await request(server)
    .get("/api/security/devices")
    .set("cookie", refreshCookie)
    .expect(200);
  return res.body as DeviceViewModel[];
}

beforeAll(async () => {
  app = await createTestApp([UserAccountsModule]);
  server = app.getHttpServer();
  sessionRepo = app.get<Repository<SessionEntity>>(getRepositoryToken(SessionEntity));
  usersService = app.get(UsersService);
  sessionsRepository = app.get(SessionsRepository);
  await truncateAllTables(app);
});

beforeEach(async () => {
  await truncateAllTables(app);
});

afterAll(async () => {
  await app.close();
});

describe("Security API — GET /api/security/devices", () => {
  it("returns 401 when no refreshToken cookie is provided", async () => {
    await request(server).get("/api/security/devices").expect(401);
  });

  it("returns 401 when the refreshToken cookie is malformed", async () => {
    await request(server)
      .get("/api/security/devices")
      .set("cookie", "refreshToken=not-a-jwt")
      .expect(401);
  });

  it("returns 401 when the refreshToken belongs to a session that no longer exists", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const { refreshCookie } = await createSessionFor({ userId: user.id });
    await sessionRepo.delete({ userId: user.id });

    await request(server).get("/api/security/devices").set("cookie", refreshCookie).expect(401);
  });

  it("returns the single active device for the current user with isCurrent=true", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const { deviceId, refreshCookie } = await createSessionFor({
      title: "Chrome on macOS",
      userId: user.id,
    });

    const devices = await getDevices(refreshCookie);

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      deviceId,
      ip: "127.0.0.1",
      isCurrent: true,
      lastActiveDate: expect.any(String),
      title: "Chrome on macOS",
    });
  });

  it("returns every active device for the current user with only one flagged as current", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const first = await createSessionFor({ title: "Chrome on macOS", userId: user.id });
    await createSessionFor({ title: "Firefox on Windows", userId: user.id });
    await createSessionFor({ title: "Safari on iOS", userId: user.id });

    const devices = await getDevices(first.refreshCookie);

    expect(devices).toHaveLength(3);
    const currentDevices = devices.filter((device) => device.isCurrent);
    expect(currentDevices).toHaveLength(1);
    expect(currentDevices[0]?.deviceId).toBe(first.deviceId);
    const titles = devices.map((device) => device.title).sort();
    expect(titles).toEqual(["Chrome on macOS", "Firefox on Windows", "Safari on iOS"]);
  });

  it("isolates devices per user — Bob does not see Alice's sessions", async () => {
    const alice = await createConfirmedUser("alice@example.com", "alice");
    const bob = await createConfirmedUser("bob@example.com", "bob");
    await createSessionFor({ title: "Alice Chrome", userId: alice.id });
    await createSessionFor({ title: "Alice Firefox", userId: alice.id });
    const bobSession = await createSessionFor({ title: "Bob Safari", userId: bob.id });

    const devices = await getDevices(bobSession.refreshCookie);

    expect(devices).toHaveLength(1);
    expect(devices[0]?.isCurrent).toBe(true);
    expect(devices[0]?.title).toBe("Bob Safari");
  });
});

describe("Security API — DELETE /api/security/devices (terminate other sessions)", () => {
  it("returns 401 without a refreshToken cookie", async () => {
    await request(server).delete("/api/security/devices").set("origin", ALLOWED_ORIGIN).expect(401);
  });

  it("returns 403 when the Origin header does not match an allowed origin", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const { refreshCookie } = await createSessionFor({ userId: user.id });

    await request(server)
      .delete("/api/security/devices")
      .set("origin", "http://evil.example.com")
      .set("cookie", refreshCookie)
      .expect(403);
  });

  it("terminates every session except the current one and returns 204", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const current = await createSessionFor({ title: "Current Chrome", userId: user.id });
    await createSessionFor({ title: "Other Firefox", userId: user.id });
    await createSessionFor({ title: "Other Safari", userId: user.id });
    expect(await sessionRepo.count()).toBe(3);

    await request(server)
      .delete("/api/security/devices")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", current.refreshCookie)
      .expect(204);

    const remaining = await getDevices(current.refreshCookie);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.deviceId).toBe(current.deviceId);
  });

  it("does not touch sessions belonging to other users", async () => {
    const alice = await createConfirmedUser("alice@example.com", "alice");
    const bob = await createConfirmedUser("bob@example.com", "bob");
    const aliceCurrent = await createSessionFor({ userId: alice.id });
    await createSessionFor({ userId: alice.id });
    await createSessionFor({ userId: bob.id });

    await request(server)
      .delete("/api/security/devices")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", aliceCurrent.refreshCookie)
      .expect(204);

    expect(await sessionRepo.countBy({ userId: alice.id })).toBe(1);
    expect(await sessionRepo.countBy({ userId: bob.id })).toBe(1);
  });
});

describe("Security API — DELETE /api/security/devices/:deviceId (terminate specific)", () => {
  it("returns 401 without a refreshToken cookie", async () => {
    await request(server)
      .delete("/api/security/devices/some-device-id")
      .set("origin", ALLOWED_ORIGIN)
      .expect(401);
  });

  it("returns 404 when the deviceId is unknown", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const { refreshCookie } = await createSessionFor({ userId: user.id });

    await request(server)
      .delete("/api/security/devices/non-existent-device-id")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", refreshCookie)
      .expect(404);
  });

  it("returns 404 when the deviceId belongs to another user", async () => {
    const alice = await createConfirmedUser("alice@example.com", "alice");
    const bob = await createConfirmedUser("bob@example.com", "bob");
    const aliceCurrent = await createSessionFor({ userId: alice.id });
    const bobSession = await createSessionFor({ userId: bob.id });

    await request(server)
      .delete(`/api/security/devices/${bobSession.deviceId}`)
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", aliceCurrent.refreshCookie)
      .expect(404);

    expect(await sessionRepo.countBy({ userId: bob.id })).toBe(1);
  });

  it("returns 403 when the deviceId is the current session", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const current = await createSessionFor({ userId: user.id });

    await request(server)
      .delete(`/api/security/devices/${current.deviceId}`)
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", current.refreshCookie)
      .expect(403);

    expect(await sessionRepo.countBy({ deviceId: current.deviceId })).toBe(1);
  });

  it("terminates the target session and leaves the current one intact", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const current = await createSessionFor({ title: "Current", userId: user.id });
    const target = await createSessionFor({ title: "Target", userId: user.id });
    await createSessionFor({ title: "Bystander", userId: user.id });

    await request(server)
      .delete(`/api/security/devices/${target.deviceId}`)
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", current.refreshCookie)
      .expect(204);

    const remaining = await getDevices(current.refreshCookie);
    expect(remaining).toHaveLength(2);
    expect(remaining.find((device) => device.deviceId === target.deviceId)).toBeUndefined();
    expect(remaining.find((device) => device.deviceId === current.deviceId)?.isCurrent).toBe(true);
  });
});

describe("Security API — refresh token lifecycle", () => {
  it("advances lastActiveAt on the session after POST /api/auth/refresh-token", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const session = await createSessionFor({ userId: user.id });
    const before = await sessionRepo.findOneByOrFail({ deviceId: session.deviceId });
    const beforeLastActive = before.lastActiveAt;

    await new Promise((resolve) => setTimeout(resolve, 1100));

    await request(server)
      .post("/api/auth/refresh-token")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", session.refreshCookie)
      .expect(200);

    const after = await sessionRepo.findOneByOrFail({ deviceId: session.deviceId });
    expect(after.lastActiveAt.getTime()).toBeGreaterThan(beforeLastActive.getTime());
  });

  it("removes the session from GET /api/security/devices after POST /api/auth/logout", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const survivor = await createSessionFor({ title: "Survivor", userId: user.id });
    const victim = await createSessionFor({ title: "Victim", userId: user.id });
    expect(await sessionRepo.count()).toBe(2);

    await request(server)
      .post("/api/auth/logout")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", victim.refreshCookie)
      .expect(204);

    const devices = await getDevices(survivor.refreshCookie);
    expect(devices).toHaveLength(1);
    expect(devices[0]?.deviceId).toBe(survivor.deviceId);
  });
});

describe("Security API — session expiry sanity", () => {
  it("permits a future-dated session row to be found by the guard", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const session = await createSessionFor({ userId: user.id });

    await sessionRepo.update(
      { deviceId: session.deviceId },
      { expiresAt: addDays(new Date(), REFRESH_SESSION_TTL_DAYS) },
    );

    const devices = await getDevices(session.refreshCookie);
    expect(devices).toHaveLength(1);
    expect(devices[0]?.isCurrent).toBe(true);
  });

  it("returns 401 from the guard when the session's tokenJti has been rotated", async () => {
    const user = await createConfirmedUser("alice@example.com", "alice");
    const session = await createSessionFor({ userId: user.id });

    await sessionRepo.update({ deviceId: session.deviceId }, { tokenJti: "rotated-jti" });

    await request(server)
      .get("/api/security/devices")
      .set("cookie", session.refreshCookie)
      .expect(401);

    expect(await sessionRepo.countBy({ deviceId: session.deviceId })).toBe(0);
  });
});
