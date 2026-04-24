import { ROLE } from "@app/shared";
import { hash } from "bcryptjs";

import { env } from "../config/env.js";
import * as usersRepository from "../db/repositories/users.repository.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("bootstrap.service");

const BCRYPT_SALT_ROUNDS = 10;

export async function ensureSuperAdminSeed(): Promise<void> {
  const { superAdminEmail, superAdminLogin, superAdminPassword } = env;

  if (!superAdminLogin || !superAdminEmail || !superAdminPassword) {
    return;
  }

  const existingSuperAdmin = await usersRepository.findFirstByRole(ROLE.superAdmin);
  if (existingSuperAdmin) {
    log.info(
      { existingSuperAdminLogin: existingSuperAdmin.login },
      "super-admin already exists, skipping seed",
    );
    return;
  }

  const loginTaken = await usersRepository.findByLogin(superAdminLogin);
  if (loginTaken) {
    log.warn(
      { login: superAdminLogin },
      "cannot seed super-admin: login already taken by non-super user",
    );
    return;
  }

  const passwordHash = await hash(superAdminPassword, BCRYPT_SALT_ROUNDS);
  await usersRepository.create({
    email: superAdminEmail,
    emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
    login: superAdminLogin,
    passwordHash,
    role: ROLE.superAdmin,
  });

  log.info({ login: superAdminLogin }, "super-admin seed created");
}
