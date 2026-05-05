import type { UserRole, UsersQuery } from "@app/shared";

import { ROLE } from "@app/shared";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model } from "mongoose";

import { escapeRegExp } from "../../../../core/regex.js";
import { type EmailConfirmation, User, type UserDoc } from "../domain/user.entity.js";

export type UserCreateInput = Pick<
  UserDoc,
  "email" | "emailConfirmation" | "login" | "passwordHash" | "passwordRecovery" | "role"
>;

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async atomicResetPassword({
    newPasswordHash,
    now,
    recoveryCode,
  }: {
    newPasswordHash: string;
    now: Date;
    recoveryCode: string;
  }): Promise<null | UserDoc> {
    return this.userModel
      .findOneAndUpdate(
        {
          "passwordRecovery.code": recoveryCode,
          "passwordRecovery.expiresAt": { $gt: now },
        },
        {
          $set: { passwordHash: newPasswordHash },
          $unset: { "passwordRecovery.code": "", "passwordRecovery.expiresAt": "" },
        },
        { returnDocument: "after" },
      )
      .lean();
  }

  async backfillMissingRole(): Promise<number> {
    const result = await this.userModel.updateMany(
      { role: { $exists: false } },
      { $set: { role: ROLE.user } },
    );
    return result.modifiedCount;
  }

  async clearAll(): Promise<void> {
    await this.userModel.deleteMany({});
  }

  async create(input: UserCreateInput): Promise<UserDoc> {
    const doc = await this.userModel.create(input);
    return doc.toObject();
  }

  async findByEmail(email: string): Promise<null | UserDoc> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).lean();
  }

  async findByEmailConfirmationCode(code: string): Promise<null | UserDoc> {
    return this.userModel.findOne({ "emailConfirmation.code": code }).lean();
  }

  async findById(id: string): Promise<null | UserDoc> {
    return this.userModel.findById(id).lean();
  }

  async findByLogin(login: string): Promise<null | UserDoc> {
    return this.userModel.findOne({ login }).lean();
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<null | UserDoc> {
    return this.userModel
      .findOne({
        $or: [{ email: loginOrEmail }, { login: loginOrEmail }],
      })
      .lean();
  }

  async findPage(query: UsersQuery): Promise<{ items: UserDoc[]; totalCount: number }> {
    const filter = buildFilter(query);
    const skip = (query.pageNumber - 1) * query.pageSize;
    const sortOrder = query.sortDirection === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [query.sortBy]: sortOrder })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async markEmailConfirmed(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      "emailConfirmation.isConfirmed": true,
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id);
    return result !== null;
  }

  async setPasswordRecovery({
    code,
    expiresAt,
    userId,
  }: {
    code: string;
    expiresAt: Date;
    userId: string;
  }): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        "passwordRecovery.code": code,
        "passwordRecovery.expiresAt": expiresAt,
      },
    });
  }

  async updateEmailConfirmation(
    userId: string,
    emailConfirmation: EmailConfirmation,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { emailConfirmation });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { passwordHash });
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { role });
  }
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
