import type { DeviceViewModel } from "@app/shared";
import type { Express } from "express";

import { hash } from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { UserModel } from "../db/models/user.model.js";

const app: Express = createApp();

const BCRYPT_SALT_ROUNDS = 10;
const TEST_ORIGIN = "http://localhost:5173";

const primaryUser = {
  email: "primary@test.dev",
  login: "primaryuser",
  password: "primarypass1",
};

const secondaryUser = {
  email: "secondary@test.dev",
  login: "secondaryuser",
  password: "secondarypass1",
};

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const FIREFOX_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
const EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";

async function fetchDevices(agent: ReturnType<typeof request.agent>): Promise<DeviceViewModel[]> {
  const res = await agent.get("/api/security/devices");
  expect(res.status).toBe(200);
  return res.body as DeviceViewModel[];
}

async function loginWithAgent(
  agent: ReturnType<typeof request.agent>,
  creds: { login: string; password: string },
  userAgent: string,
): Promise<void> {
  await agent
    .post("/api/auth/login")
    .set("User-Agent", userAgent)
    .set("Origin", TEST_ORIGIN)
    .send({ loginOrEmail: creds.login, password: creds.password })
    .expect(200);
}

async function seedConfirmedUser(creds: {
  email: string;
  login: string;
  password: string;
}): Promise<void> {
  const passwordHash = await hash(creds.password, BCRYPT_SALT_ROUNDS);
  await UserModel.create({
    email: creds.email,
    emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
    login: creds.login,
    passwordHash,
    role: "user",
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Security devices API", () => {
  describe("GET /api/security/devices", () => {
    it("returns 401 when no refreshToken cookie is sent", async () => {
      const res = await request(app).get("/api/security/devices");

      expect(res.status).toBe(401);
    });

    it("returns 401 when refreshToken cookie is garbage", async () => {
      const res = await request(app)
        .get("/api/security/devices")
        .set("Cookie", "refreshToken=garbage.value.here");

      expect(res.status).toBe(401);
    });

    it("returns 4 active devices after 4 logins with different user-agents", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const devices = await fetchDevices(chrome);

      expect(devices).toHaveLength(4);
      const deviceIds = devices.map((device) => device.deviceId);
      expect(new Set(deviceIds).size).toBe(4);
      for (const device of devices) {
        expect(typeof device.deviceId).toBe("string");
        expect(typeof device.title).toBe("string");
        expect(typeof device.ip).toBe("string");
        expect(typeof device.lastActiveDate).toBe("string");
        expect(typeof device.isCurrent).toBe("boolean");
      }
    });

    it("marks exactly one device as isCurrent for the requesting session", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);

      const devicesFromChrome = await fetchDevices(chrome);
      const currentDevices = devicesFromChrome.filter((device) => device.isCurrent);
      expect(currentDevices).toHaveLength(1);
      expect(currentDevices[0]?.title.toLowerCase()).toContain("chrome");

      const devicesFromSafari = await fetchDevices(safari);
      const currentFromSafari = devicesFromSafari.filter((device) => device.isCurrent);
      expect(currentFromSafari).toHaveLength(1);
      expect(currentFromSafari[0]?.title.toLowerCase()).toContain("safari");
    });
  });

  describe("POST /api/auth/refresh-token effect on devices list", () => {
    it("keeps deviceId stable and bumps lastActiveDate only for the refreshed device", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const before = await fetchDevices(chrome);
      const chromeDeviceBefore = before.find((device) =>
        device.title.toLowerCase().includes("chrome"),
      );
      expect(chromeDeviceBefore).toBeDefined();

      await wait(1100);
      const refreshRes = await chrome.post("/api/auth/refresh-token").set("Origin", TEST_ORIGIN);
      expect(refreshRes.status).toBe(200);

      const after = await fetchDevices(chrome);
      expect(after).toHaveLength(4);

      const beforeById = new Map(before.map((device) => [device.deviceId, device]));
      const afterById = new Map(after.map((device) => [device.deviceId, device]));

      expect([...afterById.keys()].sort()).toEqual([...beforeById.keys()].sort());

      const chromeAfter = afterById.get(chromeDeviceBefore!.deviceId);
      expect(chromeAfter).toBeDefined();
      expect(new Date(chromeAfter!.lastActiveDate).getTime()).toBeGreaterThan(
        new Date(chromeDeviceBefore!.lastActiveDate).getTime(),
      );

      for (const [deviceId, beforeDevice] of beforeById) {
        if (deviceId === chromeDeviceBefore!.deviceId) continue;
        const afterDevice = afterById.get(deviceId);
        expect(afterDevice).toBeDefined();
        expect(afterDevice!.lastActiveDate).toBe(beforeDevice.lastActiveDate);
      }
    });

    it("invalidates the previous refreshToken cookie after rotation", async () => {
      await seedConfirmedUser(primaryUser);
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Chrome/120")
        .set("Origin", TEST_ORIGIN)
        .send({ loginOrEmail: primaryUser.login, password: primaryUser.password });
      const setCookie = loginRes.headers["set-cookie"] as string[] | undefined;
      const initialCookie = Array.isArray(setCookie) ? (setCookie[0] ?? "") : "";
      const oldRefreshMatch = /refreshToken=([^;]+)/.exec(initialCookie);
      const oldRefresh = oldRefreshMatch?.[1] ?? "";

      await wait(1100);
      await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `refreshToken=${oldRefresh}`)
        .set("Origin", TEST_ORIGIN)
        .expect(200);

      const res = await request(app)
        .get("/api/security/devices")
        .set("Cookie", `refreshToken=${oldRefresh}`);

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/security/devices/:deviceId", () => {
    it("returns 204 and removes only the targeted device", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const initial = await fetchDevices(chrome);
      const safariDevice = initial.find((device) => device.title.toLowerCase().includes("safari"));
      expect(safariDevice).toBeDefined();

      const deleteRes = await chrome
        .delete(`/api/security/devices/${safariDevice!.deviceId}`)
        .set("Origin", TEST_ORIGIN);
      expect(deleteRes.status).toBe(204);

      const remaining = await fetchDevices(chrome);
      expect(remaining).toHaveLength(3);
      expect(
        remaining.find((device) => device.deviceId === safariDevice!.deviceId),
      ).toBeUndefined();
    });

    it("returns 404 for an unknown deviceId", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      await loginWithAgent(chrome, primaryUser, "Chrome/120");

      const res = await chrome
        .delete("/api/security/devices/00000000-0000-0000-0000-000000000000")
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(404);
    });

    it("returns 404 when trying to terminate a device that belongs to another user", async () => {
      await seedConfirmedUser(primaryUser);
      await seedConfirmedUser(secondaryUser);

      const primaryAgent = request.agent(app);
      const secondaryAgent = request.agent(app);

      await loginWithAgent(primaryAgent, primaryUser, "Chrome/120");
      await loginWithAgent(secondaryAgent, secondaryUser, "Firefox/121");

      const secondaryDevices = await fetchDevices(secondaryAgent);
      expect(secondaryDevices).toHaveLength(1);
      const targetDeviceId = secondaryDevices[0]?.deviceId ?? "";

      const res = await primaryAgent
        .delete(`/api/security/devices/${targetDeviceId}`)
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(404);
    });

    it("delete other user's deviceId returns 404 (not 403, to avoid existence disclosure)", async () => {
      await seedConfirmedUser(primaryUser);
      await seedConfirmedUser(secondaryUser);

      const primaryAgent = request.agent(app);
      const secondaryAgent = request.agent(app);

      await loginWithAgent(primaryAgent, primaryUser, "Chrome/120");
      await loginWithAgent(secondaryAgent, secondaryUser, "Firefox/121");

      const secondaryDevices = await fetchDevices(secondaryAgent);
      const realDeviceId = secondaryDevices[0]?.deviceId ?? "";
      const fakeDeviceId = "00000000-0000-0000-0000-000000000001";

      const realRes = await primaryAgent
        .delete(`/api/security/devices/${realDeviceId}`)
        .set("Origin", TEST_ORIGIN);
      const fakeRes = await primaryAgent
        .delete(`/api/security/devices/${fakeDeviceId}`)
        .set("Origin", TEST_ORIGIN);

      expect(realRes.status).toBe(404);
      expect(fakeRes.status).toBe(404);
      expect(realRes.status).toBe(fakeRes.status);
    });

    it("returns 403 and does not delete the session when targeting the current device", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      await loginWithAgent(chrome, primaryUser, CHROME_UA);

      const devices = await fetchDevices(chrome);
      const currentDevice = devices.find((device) => device.isCurrent);
      expect(currentDevice).toBeDefined();

      const res = await chrome
        .delete(`/api/security/devices/${currentDevice!.deviceId}`)
        .set("Origin", TEST_ORIGIN);
      expect(res.status).toBe(403);

      const remaining = await fetchDevices(chrome);
      expect(remaining.find((device) => device.deviceId === currentDevice!.deviceId)).toBeDefined();
    });

    it("returns 401 when no refreshToken cookie is sent", async () => {
      const res = await request(app)
        .delete("/api/security/devices/00000000-0000-0000-0000-000000000000")
        .set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout effect on devices list", () => {
    it("removes the logged-out device from the list", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const initial = await fetchDevices(chrome);
      const firefoxDevice = initial.find((device) =>
        device.title.toLowerCase().includes("firefox"),
      );
      expect(firefoxDevice).toBeDefined();

      const logoutRes = await firefox.post("/api/auth/logout").set("Origin", TEST_ORIGIN);
      expect(logoutRes.status).toBe(204);

      const remaining = await fetchDevices(chrome);
      expect(remaining).toHaveLength(3);
      expect(
        remaining.find((device) => device.deviceId === firefoxDevice!.deviceId),
      ).toBeUndefined();
    });
  });

  describe("DELETE /api/security/devices", () => {
    it("returns 204 and leaves only the current device active", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const initial = await fetchDevices(chrome);
      const chromeDevice = initial.find((device) => device.title.toLowerCase().includes("chrome"));
      expect(chromeDevice).toBeDefined();

      const res = await chrome.delete("/api/security/devices").set("Origin", TEST_ORIGIN);
      expect(res.status).toBe(204);

      const remaining = await fetchDevices(chrome);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.deviceId).toBe(chromeDevice!.deviceId);
    });

    it("returns 401 when no refreshToken cookie is sent", async () => {
      const res = await request(app).delete("/api/security/devices").set("Origin", TEST_ORIGIN);

      expect(res.status).toBe(401);
    });
  });

  describe("End-to-end devices lifecycle scenario", () => {
    it("walks through login x4 -> refresh -> delete -> logout -> delete others", async () => {
      await seedConfirmedUser(primaryUser);
      const chrome = request.agent(app);
      const safari = request.agent(app);
      const firefox = request.agent(app);
      const edge = request.agent(app);

      await loginWithAgent(chrome, primaryUser, CHROME_UA);
      await loginWithAgent(safari, primaryUser, SAFARI_UA);
      await loginWithAgent(firefox, primaryUser, FIREFOX_UA);
      await loginWithAgent(edge, primaryUser, EDGE_UA);

      const afterLogin = await fetchDevices(chrome);
      expect(afterLogin).toHaveLength(4);

      const chromeDeviceId = afterLogin.find((device) =>
        device.title.toLowerCase().includes("chrome"),
      )?.deviceId;
      const safariDeviceId = afterLogin.find((device) =>
        device.title.toLowerCase().includes("safari"),
      )?.deviceId;
      const firefoxDeviceId = afterLogin.find((device) =>
        device.title.toLowerCase().includes("firefox"),
      )?.deviceId;
      expect(chromeDeviceId).toBeDefined();
      expect(safariDeviceId).toBeDefined();
      expect(firefoxDeviceId).toBeDefined();

      await wait(1100);
      await chrome.post("/api/auth/refresh-token").set("Origin", TEST_ORIGIN).expect(200);

      const afterRefresh = await fetchDevices(chrome);
      expect(afterRefresh).toHaveLength(4);
      expect(
        afterRefresh.find((device) => device.deviceId === chromeDeviceId)?.lastActiveDate,
      ).not.toBe(afterLogin.find((device) => device.deviceId === chromeDeviceId)?.lastActiveDate);

      await chrome
        .delete(`/api/security/devices/${safariDeviceId}`)
        .set("Origin", TEST_ORIGIN)
        .expect(204);

      const afterDelete = await fetchDevices(chrome);
      expect(afterDelete).toHaveLength(3);
      expect(afterDelete.find((device) => device.deviceId === safariDeviceId)).toBeUndefined();

      await firefox.post("/api/auth/logout").set("Origin", TEST_ORIGIN).expect(204);

      const afterLogout = await fetchDevices(chrome);
      expect(afterLogout).toHaveLength(2);
      expect(afterLogout.find((device) => device.deviceId === firefoxDeviceId)).toBeUndefined();

      await chrome.delete("/api/security/devices").set("Origin", TEST_ORIGIN).expect(204);

      const finalList = await fetchDevices(chrome);
      expect(finalList).toHaveLength(1);
      expect(finalList[0]?.deviceId).toBe(chromeDeviceId);
    });
  });
});
