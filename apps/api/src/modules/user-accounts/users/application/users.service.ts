import type { CreateUserInput, UpdateUserRoleInput, UsersQuery, UserViewModel } from "@app/shared";
import type { Paginator } from "@app/shared";

import { ROLE } from "@app/shared";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { hash } from "bcryptjs";
import { type Connection } from "mongoose";

import type { EmailConfirmation, UserDoc } from "../domain/user.entity.js";

import { BadRequestError, NotFoundError } from "../../../../core/exceptions/errors.js";
import { createLogger } from "../../../../core/logger.js";
import { buildPaginator } from "../../../../core/paginator.js";
import { UsersRepository } from "../infrastructure/users.repository.js";

const BCRYPT_SALT_ROUNDS = 10;
const log = createLogger("users.service");

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async clearAllUsers(): Promise<void> {
    await this.usersRepository.clearAll();
  }

  async createUser(input: CreateUserInput): Promise<UserViewModel> {
    const [existingLogin, existingEmail] = await Promise.all([
      this.usersRepository.findByLogin(input.login),
      this.usersRepository.findByEmail(input.email),
    ]);

    if (existingLogin || existingEmail) {
      const fields = [
        ...(existingLogin ? [{ field: "login", message: "Login is already taken" }] : []),
        ...(existingEmail ? [{ field: "email", message: "Email is already taken" }] : []),
      ];
      throw new BadRequestError("User already exists", { fields });
    }

    const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS);
    const doc = await this.usersRepository.create({
      email: input.email,
      emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
      login: input.login,
      passwordHash,
      passwordRecovery: { code: null, expiresAt: null },
      role: ROLE.user,
    });

    return toUserView(doc);
  }

  async deleteUser(id: string): Promise<void> {
    const target = await this.usersRepository.findById(id);
    if (!target) throw new NotFoundError(`User with id ${id} not found`);
    if (target.role === ROLE.superAdmin) throw new BadRequestError("Cannot delete super-admin");
    const removed = await this.usersRepository.remove(id);
    if (!removed) throw new NotFoundError(`User with id ${id} not found`);
  }

  async getAllUsers(query: UsersQuery): Promise<Paginator<UserViewModel>> {
    const { items, totalCount } = await this.usersRepository.findPage(query);
    return buildPaginator({
      items: items.map(toUserView),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.connection.readyState !== 1) {
      log.warn("mongo connection not ready, skipping role backfill");
      return;
    }
    try {
      const backfilledRoleCount = await this.usersRepository.backfillMissingRole();
      if (backfilledRoleCount > 0) {
        log.info({ count: backfilledRoleCount }, "backfilled missing role field on users");
      }
    } catch (err) {
      log.warn({ err }, "role backfill failed, continuing");
    }
  }

  async registerUser(
    input: CreateUserInput & { emailConfirmation: EmailConfirmation },
  ): Promise<UserDoc> {
    const { emailConfirmation, ...userInput } = input;

    const [existingLogin, existingEmail] = await Promise.all([
      this.usersRepository.findByLogin(userInput.login),
      this.usersRepository.findByEmail(userInput.email),
    ]);

    if (existingLogin || existingEmail) {
      const fields = [
        ...(existingLogin ? [{ field: "login", message: "Login is already taken" }] : []),
        ...(existingEmail ? [{ field: "email", message: "Email is already taken" }] : []),
      ];
      throw new BadRequestError("User already exists", { fields });
    }

    const passwordHash = await hash(userInput.password, BCRYPT_SALT_ROUNDS);
    return this.usersRepository.create({
      email: userInput.email,
      emailConfirmation,
      login: userInput.login,
      passwordHash,
      passwordRecovery: { code: null, expiresAt: null },
      role: ROLE.user,
    });
  }

  async updateUserRole({
    actorUserId,
    newRole,
    targetUserId,
  }: {
    actorUserId: string;
    newRole: UpdateUserRoleInput["role"];
    targetUserId: string;
  }): Promise<void> {
    if (targetUserId === actorUserId) {
      throw new BadRequestError("Cannot change your own role");
    }

    const target = await this.usersRepository.findById(targetUserId);
    if (!target) throw new NotFoundError(`User with id ${targetUserId} not found`);

    if (target.role === ROLE.superAdmin) {
      throw new BadRequestError("Cannot change super-admin role");
    }

    if (target.role === newRole) {
      return;
    }

    await this.usersRepository.updateRole(targetUserId, newRole);
  }
}

export function toUserView(doc: UserDoc): UserViewModel {
  return {
    createdAt: doc.createdAt.toISOString(),
    email: doc.email,
    id: doc._id.toHexString(),
    login: doc.login,
    role: doc.role,
  };
}
