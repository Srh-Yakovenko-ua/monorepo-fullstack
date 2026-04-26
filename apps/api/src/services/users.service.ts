import type { CreateUserInput, UpdateUserRoleInput, UsersQuery, UserViewModel } from "@app/shared";
import type { Paginator } from "@app/shared";

import { ROLE } from "@app/shared";
import { hash } from "bcryptjs";

import type { EmailConfirmation, UserDoc } from "../db/models/user.model.js";

import * as usersRepository from "../db/repositories/users.repository.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { buildPaginator } from "../lib/paginator.js";

const BCRYPT_SALT_ROUNDS = 10;

export async function clearAllUsers(): Promise<void> {
  await usersRepository.clearAll();
}

export async function createUser(input: CreateUserInput): Promise<UserViewModel> {
  const [existingLogin, existingEmail] = await Promise.all([
    usersRepository.findByLogin(input.login),
    usersRepository.findByEmail(input.email),
  ]);

  if (existingLogin || existingEmail) {
    const fields = [
      ...(existingLogin ? [{ field: "login", message: "Login is already taken" }] : []),
      ...(existingEmail ? [{ field: "email", message: "Email is already taken" }] : []),
    ];
    throw new BadRequestError("User already exists", { fields });
  }

  const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS);
  const doc = await usersRepository.create({
    email: input.email,
    emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
    login: input.login,
    passwordHash,
    passwordRecovery: { code: null, expiresAt: null },
    role: ROLE.user,
  });

  return toUserView(doc);
}

export async function deleteUser(id: string): Promise<void> {
  const target = await usersRepository.findById(id);
  if (!target) throw new NotFoundError(`User with id ${id} not found`);
  if (target.role === ROLE.superAdmin) throw new BadRequestError("Cannot delete super-admin");
  const removed = await usersRepository.remove(id);
  if (!removed) throw new NotFoundError(`User with id ${id} not found`);
}

export async function getAllUsers(query: UsersQuery): Promise<Paginator<UserViewModel>> {
  const { items, totalCount } = await usersRepository.findPage(query);
  return buildPaginator({
    items: items.map(toUserView),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export async function registerUser(
  input: CreateUserInput & { emailConfirmation: EmailConfirmation },
): Promise<UserDoc> {
  const { emailConfirmation, ...userInput } = input;

  const [existingLogin, existingEmail] = await Promise.all([
    usersRepository.findByLogin(userInput.login),
    usersRepository.findByEmail(userInput.email),
  ]);

  if (existingLogin || existingEmail) {
    const fields = [
      ...(existingLogin ? [{ field: "login", message: "Login is already taken" }] : []),
      ...(existingEmail ? [{ field: "email", message: "Email is already taken" }] : []),
    ];
    throw new BadRequestError("User already exists", { fields });
  }

  const passwordHash = await hash(userInput.password, BCRYPT_SALT_ROUNDS);
  return usersRepository.create({
    email: userInput.email,
    emailConfirmation,
    login: userInput.login,
    passwordHash,
    passwordRecovery: { code: null, expiresAt: null },
    role: ROLE.user,
  });
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

export async function updateUserRole({
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

  const target = await usersRepository.findById(targetUserId);
  if (!target) throw new NotFoundError(`User with id ${targetUserId} not found`);

  if (target.role === ROLE.superAdmin) {
    throw new BadRequestError("Cannot change super-admin role");
  }

  if (target.role === newRole) {
    return;
  }

  await usersRepository.updateRole(targetUserId, newRole);
}
