import type { LoginInput } from "@app/shared";

import { compare } from "bcrypt";

import * as usersRepository from "../db/repositories/users.repository.js";
import { UnauthorizedError } from "../lib/errors.js";

export async function validateCredentials(input: LoginInput): Promise<void> {
  const user = await usersRepository.findByLoginOrEmail(input.loginOrEmail);
  if (!user) throw new UnauthorizedError("Invalid login or password");

  const passwordMatches = await compare(input.password, user.passwordHash);
  if (!passwordMatches) throw new UnauthorizedError("Invalid login or password");
}
