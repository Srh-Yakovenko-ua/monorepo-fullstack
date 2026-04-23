import type { LoginInput, LoginSuccessViewModel, MeViewModel } from "@app/shared";

import { compare } from "bcryptjs";

import * as usersRepository from "../db/repositories/users.repository.js";
import { UnauthorizedError } from "../lib/errors.js";
import { signAccessToken } from "../lib/jwt.js";

export async function getCurrentUser(userId: string): Promise<MeViewModel> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new UnauthorizedError();

  return {
    email: user.email,
    login: user.login,
    userId: user._id.toHexString(),
  };
}

export async function login(input: LoginInput): Promise<LoginSuccessViewModel> {
  const user = await usersRepository.findByLoginOrEmail(input.loginOrEmail);
  if (!user) throw new UnauthorizedError("Invalid login or password");

  const passwordMatches = await compare(input.password, user.passwordHash);
  if (!passwordMatches) throw new UnauthorizedError("Invalid login or password");

  const accessToken = await signAccessToken({ userId: user._id.toHexString() });
  return { accessToken };
}
