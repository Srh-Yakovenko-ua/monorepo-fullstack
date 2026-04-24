import { ROLE } from "@app/shared";
import { hash } from "bcryptjs";
import { parseArgs } from "node:util";

import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import * as usersRepository from "../src/db/repositories/users.repository.js";
import { createLogger } from "../src/lib/logger.js";

const log = createLogger("super-admin-script");

const BCRYPT_SALT_ROUNDS = 10;
const USAGE = [
  "Usage:",
  "  super-admin create       --login=<login> --email=<email> --password=<password>",
  "  super-admin promote      --login=<login>",
  "  super-admin set-password --login=<login> --password=<password>",
].join("\n");

type Action = "create" | "promote" | "set-password";

async function createSuperAdmin({
  email,
  login,
  password,
}: {
  email: string | undefined;
  login: string;
  password: string | undefined;
}): Promise<void> {
  if (!email || !password) {
    console.error("create mode requires --email and --password");
    process.exit(1);
  }

  const [byLogin, byEmail] = await Promise.all([
    usersRepository.findByLogin(login),
    usersRepository.findByEmail(email),
  ]);

  if (byLogin) {
    console.error(`User with login "${login}" already exists — use "promote" instead`);
    process.exit(1);
  }
  if (byEmail) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const passwordHash = await hash(password, BCRYPT_SALT_ROUNDS);
  const doc = await usersRepository.create({
    email,
    emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
    login,
    passwordHash,
    role: ROLE.superAdmin,
  });

  log.info({ id: doc._id.toHexString(), login }, "super-admin created");
}

function isAction(value: string | undefined): value is Action {
  return value === "create" || value === "promote" || value === "set-password";
}

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!isAction(action)) {
    console.error(USAGE);
    process.exit(1);
  }

  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      email: { type: "string" },
      login: { type: "string" },
      password: { type: "string" },
    },
    strict: true,
  });

  if (!values.login) {
    console.error("--login is required");
    console.error(USAGE);
    process.exit(1);
  }

  await connectMongo();

  try {
    if (action === "create") {
      await createSuperAdmin({
        email: values.email,
        login: values.login,
        password: values.password,
      });
    } else if (action === "promote") {
      await promoteToSuperAdmin(values.login);
    } else {
      await setSuperAdminPassword({ login: values.login, password: values.password });
    }
  } finally {
    await disconnectMongo();
  }
}

async function promoteToSuperAdmin(login: string): Promise<void> {
  const user = await usersRepository.findByLogin(login);
  if (!user) {
    console.error(`User with login "${login}" not found`);
    process.exit(1);
  }

  if (user.role === ROLE.superAdmin) {
    log.info({ login }, "already a super-admin, nothing to do");
    return;
  }

  await usersRepository.updateRole(user._id.toHexString(), ROLE.superAdmin);
  log.info({ login, previousRole: user.role }, "promoted to super-admin");
}

async function setSuperAdminPassword({
  login,
  password,
}: {
  login: string;
  password: string | undefined;
}): Promise<void> {
  if (!password) {
    console.error("set-password mode requires --password");
    process.exit(1);
  }

  const user = await usersRepository.findByLogin(login);
  if (!user) {
    console.error(`User with login "${login}" not found`);
    process.exit(1);
  }

  const passwordHash = await hash(password, BCRYPT_SALT_ROUNDS);
  await usersRepository.updatePasswordHash(user._id.toHexString(), passwordHash);
  log.info({ login, role: user.role }, "password updated");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
