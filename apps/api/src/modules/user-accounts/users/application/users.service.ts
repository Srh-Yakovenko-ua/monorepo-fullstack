import type {
  CreateUserInput,
  Paginator,
  UpdateUserRoleInput,
  UsersQuery,
  UserViewModel,
} from "@app/shared";

import { ROLE } from "@app/shared";
import { Injectable } from "@nestjs/common";
import { hash } from "bcryptjs";

import type { UserDoc } from "../domain/user.entity.js";

import { BadRequestError, NotFoundError } from "../../../../core/exceptions/errors.js";
import { buildPaginator } from "../../../../core/paginator.js";
import { UsersRepository } from "../infrastructure/users.repository.js";

const BCRYPT_SALT_ROUNDS = 10;

export type RegistrationConfirmation = {
  code: null | string;
  expiresAt: Date | null;
  isConfirmed: boolean;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async clearAllUsers(): Promise<void> {
    await this.usersRepository.clearAll();
  }

  async createUser(input: CreateUserInput): Promise<UserViewModel> {
    await this.assertLoginAndEmailAvailable(input);

    const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS);
    const doc = await this.usersRepository.create({
      email: input.email,
      emailConfirmationCode: null,
      emailConfirmationExpiresAt: null,
      emailIsConfirmed: true,
      login: input.login,
      passwordHash,
      role: ROLE.user,
    });

    return toUserView(doc);
  }

  async deleteUser(id: number): Promise<void> {
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

  async registerUser(
    input: CreateUserInput & { emailConfirmation: RegistrationConfirmation },
  ): Promise<UserDoc> {
    const { emailConfirmation, ...userInput } = input;
    await this.assertLoginAndEmailAvailable(userInput);

    const passwordHash = await hash(userInput.password, BCRYPT_SALT_ROUNDS);
    return this.usersRepository.create({
      email: userInput.email,
      emailConfirmationCode: emailConfirmation.code,
      emailConfirmationExpiresAt: emailConfirmation.expiresAt,
      emailIsConfirmed: emailConfirmation.isConfirmed,
      login: userInput.login,
      passwordHash,
      role: ROLE.user,
    });
  }

  async updateUserRole({
    actorUserId,
    newRole,
    targetUserId,
  }: {
    actorUserId: number;
    newRole: UpdateUserRoleInput["role"];
    targetUserId: number;
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

  private async assertLoginAndEmailAvailable(input: {
    email: string;
    login: string;
  }): Promise<void> {
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
  }
}

export function toUserView(doc: UserDoc): UserViewModel {
  return {
    createdAt: doc.createdAt.toISOString(),
    email: doc.email,
    id: String(doc.id),
    login: doc.login,
    role: doc.role,
  };
}
