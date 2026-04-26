import type { UserRole, UsersQuery } from "@app/shared";

import { ROLE } from "@app/shared";

import type { EmailConfirmation, UserDoc } from "../models/user.model.js";

import { escapeRegExp } from "../../lib/regex.js";
import { UserModel } from "../models/user.model.js";

export type UserCreateInput = Pick<
  UserDoc,
  "email" | "emailConfirmation" | "login" | "passwordHash" | "passwordRecovery" | "role"
>;

export async function atomicResetPassword({
  newPasswordHash,
  now,
  recoveryCode,
}: {
  newPasswordHash: string;
  now: Date;
  recoveryCode: string;
}): Promise<null | UserDoc> {
  return UserModel.findOneAndUpdate(
    {
      "passwordRecovery.code": recoveryCode,
      "passwordRecovery.expiresAt": { $gt: now },
    },
    {
      $set: { passwordHash: newPasswordHash },
      $unset: { "passwordRecovery.code": "", "passwordRecovery.expiresAt": "" },
    },
    { returnDocument: "after" },
  ).lean();
}

export async function backfillMissingRole(): Promise<number> {
  const result = await UserModel.updateMany(
    { role: { $exists: false } },
    { $set: { role: ROLE.user } },
  );
  return result.modifiedCount;
}

export async function clearAll(): Promise<void> {
  await UserModel.deleteMany({});
}

export async function create(input: UserCreateInput): Promise<UserDoc> {
  const doc = await UserModel.create(input);
  return doc.toObject();
}

export async function findByEmail(email: string): Promise<null | UserDoc> {
  return UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
}

export async function findByEmailConfirmationCode(code: string): Promise<null | UserDoc> {
  return UserModel.findOne({ "emailConfirmation.code": code }).lean();
}

export async function findById(id: string): Promise<null | UserDoc> {
  return UserModel.findById(id).lean();
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

export async function markEmailConfirmed(userId: string): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, {
    "emailConfirmation.isConfirmed": true,
  });
}

export async function remove(id: string): Promise<boolean> {
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
}

export async function setPasswordRecovery({
  code,
  expiresAt,
  userId,
}: {
  code: string;
  expiresAt: Date;
  userId: string;
}): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      "passwordRecovery.code": code,
      "passwordRecovery.expiresAt": expiresAt,
    },
  });
}

export async function updateEmailConfirmation(
  userId: string,
  emailConfirmation: EmailConfirmation,
): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, { emailConfirmation });
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, { passwordHash });
}

export async function updateRole(userId: string, role: UserRole): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, { role });
}

function buildFilter(query: UsersQuery): Record<string, unknown> {
  const { searchEmailTerm, searchLoginTerm } = query;

  const hasLogin = searchLoginTerm && searchLoginTerm.length > 0;
  const hasEmail = searchEmailTerm && searchEmailTerm.length > 0;

  if (hasLogin && hasEmail) {
    return {
      $or: [
        { login: { $options: "i", $regex: escapeRegExp(searchLoginTerm) } },
        { email: { $options: "i", $regex: escapeRegExp(searchEmailTerm) } },
      ],
    };
  }

  if (hasLogin) {
    return { login: { $options: "i", $regex: escapeRegExp(searchLoginTerm) } };
  }

  if (hasEmail) {
    return { email: { $options: "i", $regex: escapeRegExp(searchEmailTerm) } };
  }

  return {};
}
