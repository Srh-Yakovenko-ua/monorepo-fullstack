import type { UsersQuery } from "@app/shared";

import type { UserDoc } from "../models/user.model.js";

import { UserModel } from "../models/user.model.js";

export type UserCreateInput = Pick<UserDoc, "email" | "login" | "passwordHash">;

export async function clearAll(): Promise<void> {
  await UserModel.deleteMany({});
}

export async function create(input: UserCreateInput): Promise<UserDoc> {
  const doc = await UserModel.create(input);
  return doc.toObject();
}

export async function findByEmail(email: string): Promise<null | UserDoc> {
  return UserModel.findOne({ email }).lean();
}

export async function findByLogin(login: string): Promise<null | UserDoc> {
  return UserModel.findOne({ login }).lean();
}

export async function findByLoginOrEmail(loginOrEmail: string): Promise<null | UserDoc> {
  return UserModel.findOne({
    $or: [{ email: loginOrEmail }, { login: loginOrEmail }],
  }).lean();
}

export async function findPage(
  query: UsersQuery,
): Promise<{ items: UserDoc[]; totalCount: number }> {
  const filter = buildFilter(query);
  const skip = (query.pageNumber - 1) * query.pageSize;
  const sortOrder = query.sortDirection === "asc" ? 1 : -1;

  const [items, totalCount] = await Promise.all([
    UserModel.find(filter)
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return { items, totalCount };
}

export async function remove(id: string): Promise<boolean> {
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
}

function buildFilter(query: UsersQuery): Record<string, unknown> {
  const { searchEmailTerm, searchLoginTerm } = query;

  const hasLogin = searchLoginTerm && searchLoginTerm.length > 0;
  const hasEmail = searchEmailTerm && searchEmailTerm.length > 0;

  if (hasLogin && hasEmail) {
    return {
      $or: [
        { login: { $options: "i", $regex: searchLoginTerm } },
        { email: { $options: "i", $regex: searchEmailTerm } },
      ],
    };
  }

  if (hasLogin) {
    return { login: { $options: "i", $regex: searchLoginTerm } };
  }

  if (hasEmail) {
    return { email: { $options: "i", $regex: searchEmailTerm } };
  }

  return {};
}
