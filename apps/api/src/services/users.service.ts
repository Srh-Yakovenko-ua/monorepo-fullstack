import type { CreateUserInput, UsersQuery, UserViewModel } from "@app/shared";
import type { Paginator } from "@app/shared";

import { hash } from "bcryptjs";

import type { UserDoc } from "../db/models/user.model.js";

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
    login: input.login,
    passwordHash,
  });

  return toUserView(doc);
}

export async function deleteUser(id: string): Promise<void> {
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

export function toUserView(doc: UserDoc): UserViewModel {
  return {
    createdAt: doc.createdAt.toISOString(),
    email: doc.email,
    id: doc._id.toHexString(),
    login: doc.login,
  };
}
