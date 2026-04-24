import type { Express } from "express";

import { hash } from "bcryptjs";
import request from "supertest";

import { UserModel } from "../db/models/user.model.js";

const BCRYPT_SALT_ROUNDS = 10;

const ADMIN_TEST_CREDENTIALS = {
  email: "admin@test.dev",
  login: "testadmin",
  password: "adminpass1",
};

const SUPER_ADMIN_TEST_CREDENTIALS = {
  email: "superadmin@test.dev",
  login: "testsuperadmin",
  password: "superadminpass1",
};

export async function createAdminAndLogin(app: Express): Promise<string> {
  const existing = await UserModel.findOne({ login: ADMIN_TEST_CREDENTIALS.login });

  if (!existing) {
    const passwordHash = await hash(ADMIN_TEST_CREDENTIALS.password, BCRYPT_SALT_ROUNDS);
    await UserModel.create({
      email: ADMIN_TEST_CREDENTIALS.email,
      emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
      login: ADMIN_TEST_CREDENTIALS.login,
      passwordHash,
      role: "admin",
    });
  }

  const res = await request(app).post("/api/auth/login").send({
    loginOrEmail: ADMIN_TEST_CREDENTIALS.login,
    password: ADMIN_TEST_CREDENTIALS.password,
  });

  return res.body.accessToken as string;
}

export async function createSuperAdminAndLogin(
  app: Express,
): Promise<{ token: string; userId: string }> {
  const existing = await UserModel.findOne({ login: SUPER_ADMIN_TEST_CREDENTIALS.login });

  let userId: string;
  if (existing) {
    userId = existing._id.toHexString();
  } else {
    const passwordHash = await hash(SUPER_ADMIN_TEST_CREDENTIALS.password, BCRYPT_SALT_ROUNDS);
    const created = await UserModel.create({
      email: SUPER_ADMIN_TEST_CREDENTIALS.email,
      emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
      login: SUPER_ADMIN_TEST_CREDENTIALS.login,
      passwordHash,
      role: "superAdmin",
    });
    userId = created._id.toHexString();
  }

  const res = await request(app).post("/api/auth/login").send({
    loginOrEmail: SUPER_ADMIN_TEST_CREDENTIALS.login,
    password: SUPER_ADMIN_TEST_CREDENTIALS.password,
  });

  return { token: res.body.accessToken as string, userId };
}

export async function createUserAndLogin(
  app: Express,
  credentials: { email: string; login: string; password: string },
): Promise<string> {
  const passwordHash = await hash(credentials.password, BCRYPT_SALT_ROUNDS);
  await UserModel.create({
    email: credentials.email,
    emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
    login: credentials.login,
    passwordHash,
    role: "user",
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ loginOrEmail: credentials.login, password: credentials.password });

  return res.body.accessToken as string;
}
