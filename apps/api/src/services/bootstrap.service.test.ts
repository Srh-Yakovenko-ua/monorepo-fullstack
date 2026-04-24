import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserModel } from "../db/models/user.model.js";
import { ensureSuperAdminSeed } from "./bootstrap.service.js";

vi.mock("../config/env.js", () => ({
  env: {
    corsOrigin: "http://localhost:5173",
    emailFrom: "no-reply@example.com",
    enableSwagger: true,
    frontendUrl: "http://localhost:5173",
    jwtAccessExpiresIn: "2m",
    jwtRefreshExpiresIn: "2m",
    jwtSecret: "test-secret-that-is-at-least-32-characters-long",
    logLevel: "error",
    mongoUri: "mongodb://localhost:27017/test",
    nodeEnv: "test",
    port: 4001,
    smtpHost: "localhost",
    smtpPass: "",
    smtpPort: 25,
    smtpUser: "",
    superAdminEmail: "superadmin@example.com",
    superAdminLogin: "superadmin",
    superAdminPassword: "supersecret",
  },
}));

async function getEnvMock() {
  const mod = await import("../config/env.js");
  return mod.env as Record<string, unknown>;
}

describe("ensureSuperAdminSeed", () => {
  beforeEach(async () => {
    const envMock = await getEnvMock();
    envMock.superAdminEmail = "superadmin@example.com";
    envMock.superAdminLogin = "superadmin";
    envMock.superAdminPassword = "supersecret";

    await UserModel.deleteMany({});
  });

  it("does not create a super-admin when env vars are missing", async () => {
    const envMock = await getEnvMock();
    envMock.superAdminLogin = undefined;

    await ensureSuperAdminSeed();

    const count = await UserModel.countDocuments({ role: "superAdmin" });
    expect(count).toBe(0);
  });

  it("creates a super-admin when env is complete and DB is empty", async () => {
    await ensureSuperAdminSeed();

    const superAdmin = await UserModel.findOne({ role: "superAdmin" }).lean();
    expect(superAdmin).not.toBeNull();
    expect(superAdmin?.login).toBe("superadmin");
    expect(superAdmin?.email).toBe("superadmin@example.com");
    expect(superAdmin?.emailConfirmation.isConfirmed).toBe(true);
  });

  it("is idempotent — second call does not create a duplicate", async () => {
    await ensureSuperAdminSeed();
    await ensureSuperAdminSeed();

    const count = await UserModel.countDocuments({ role: "superAdmin" });
    expect(count).toBe(1);
  });

  it("skips seed when a super-admin with a different login already exists", async () => {
    const passwordHash = await hash("somepassword", 10);
    await UserModel.create({
      email: "existing@example.com",
      emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
      login: "differentlogin",
      passwordHash,
      role: "superAdmin",
    });

    await ensureSuperAdminSeed();

    const count = await UserModel.countDocuments({ role: "superAdmin" });
    expect(count).toBe(1);
    const doc = await UserModel.findOne({ role: "superAdmin" }).lean();
    expect(doc?.login).toBe("differentlogin");
  });

  it("skips seed when the configured login is taken by a non-super user", async () => {
    const passwordHash = await hash("somepassword", 10);
    await UserModel.create({
      email: "taken@example.com",
      emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
      login: "superadmin",
      passwordHash,
      role: "user",
    });

    await ensureSuperAdminSeed();

    const count = await UserModel.countDocuments({ role: "superAdmin" });
    expect(count).toBe(0);
  });
});
