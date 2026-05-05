import type { UserRole } from "@app/shared";

import { Injectable } from "@nestjs/common";

import { UsersRepository } from "../modules/user-accounts/users/infrastructure/users.repository.js";
import { verifyAccessToken } from "./jwt.js";

export type RequestUser = { email: string; login: string; role: UserRole; userId: string };

@Injectable()
export class AuthHelper {
  constructor(private readonly usersRepository: UsersRepository) {}

  async resolveBearerUser(token: string): Promise<null | RequestUser> {
    let userId: string;
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.userId;
    } catch {
      return null;
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) return null;

    return {
      email: user.email,
      login: user.login,
      role: user.role,
      userId: user._id.toHexString(),
    };
  }
}
