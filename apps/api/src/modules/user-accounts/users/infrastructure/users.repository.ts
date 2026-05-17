import type { UserRole, UserSortField, UsersQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";

import { type UserDoc, UserEntity } from "../domain/user.entity.js";

export type UserCreateInput = Pick<
  UserDoc,
  | "email"
  | "emailConfirmationCode"
  | "emailConfirmationExpiresAt"
  | "emailIsConfirmed"
  | "login"
  | "passwordHash"
  | "role"
>;

const USER_SORT_COLUMN_BY_FIELD: Record<UserSortField, string> = {
  createdAt: "user.createdAt",
  email: "user.email",
  login: "user.login",
};

function mapEntity(entity: UserEntity): UserDoc {
  return {
    createdAt: entity.createdAt,
    email: entity.email,
    emailConfirmationCode: entity.emailConfirmationCode,
    emailConfirmationExpiresAt: entity.emailConfirmationExpiresAt,
    emailIsConfirmed: entity.emailIsConfirmed,
    id: entity.id,
    login: entity.login,
    passwordHash: entity.passwordHash,
    passwordRecoveryCode: entity.passwordRecoveryCode,
    passwordRecoveryExpiresAt: entity.passwordRecoveryExpiresAt,
    role: entity.role,
  };
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async atomicResetPassword({
    newPasswordHash,
    now,
    recoveryCode,
  }: {
    newPasswordHash: string;
    now: Date;
    recoveryCode: string;
  }): Promise<null | UserDoc> {
    const rows = await this.repository.query<{ id: number }[]>(
      `UPDATE users
       SET password_hash = $1,
           password_recovery_code = NULL,
           password_recovery_expires_at = NULL
       WHERE password_recovery_code = $2
         AND password_recovery_expires_at > $3
       RETURNING id`,
      [newPasswordHash, recoveryCode, now],
    );
    const updatedId = rows[0]?.id;
    if (typeof updatedId !== "number") return null;
    const found = await this.repository.findOneBy({ id: updatedId });
    return found ? mapEntity(found) : null;
  }

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: UserCreateInput): Promise<UserDoc> {
    const created = this.repository.create(input);
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async findByEmail(email: string): Promise<null | UserDoc> {
    const normalized = email.trim().toLowerCase();
    const found = await this.repository.findOneBy({ email: normalized });
    return found ? mapEntity(found) : null;
  }

  async findByEmailConfirmationCode(code: string): Promise<null | UserDoc> {
    const found = await this.repository.findOneBy({ emailConfirmationCode: code });
    return found ? mapEntity(found) : null;
  }

  async findById(id: number): Promise<null | UserDoc> {
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  async findByLogin(login: string): Promise<null | UserDoc> {
    const found = await this.repository.findOneBy({ login });
    return found ? mapEntity(found) : null;
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<null | UserDoc> {
    const found = await this.repository
      .createQueryBuilder("user")
      .where("user.email = :term", { term: loginOrEmail })
      .orWhere("user.login = :term", { term: loginOrEmail })
      .getOne();
    return found ? mapEntity(found) : null;
  }

  async findPage(query: UsersQuery): Promise<{ items: UserDoc[]; totalCount: number }> {
    const sortColumn = USER_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const loginSearch = query.searchLoginTerm?.length ? query.searchLoginTerm : null;
    const emailSearch = query.searchEmailTerm?.length ? query.searchEmailTerm : null;

    const builder = this.repository
      .createQueryBuilder("user")
      .orderBy(sortColumn, sortDirection)
      .limit(query.pageSize)
      .offset(offset);

    if (loginSearch || emailSearch) {
      builder.where(
        new Brackets((qb) => {
          if (loginSearch) {
            qb.orWhere("user.login ILIKE :loginTerm", { loginTerm: `%${loginSearch}%` });
          }
          if (emailSearch) {
            qb.orWhere("user.email ILIKE :emailTerm", { emailTerm: `%${emailSearch}%` });
          }
        }),
      );
    }

    const [entities, totalCount] = await builder.getManyAndCount();
    return { items: entities.map(mapEntity), totalCount };
  }

  async markEmailConfirmed(userId: number): Promise<void> {
    await this.repository.update(
      { id: userId },
      {
        emailConfirmationCode: null,
        emailConfirmationExpiresAt: null,
        emailIsConfirmed: true,
      },
    );
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async setPasswordRecovery({
    code,
    expiresAt,
    userId,
  }: {
    code: string;
    expiresAt: Date;
    userId: number;
  }): Promise<void> {
    await this.repository.update(
      { id: userId },
      { passwordRecoveryCode: code, passwordRecoveryExpiresAt: expiresAt },
    );
  }

  async updateEmailConfirmation({
    code,
    expiresAt,
    isConfirmed,
    userId,
  }: {
    code: null | string;
    expiresAt: Date | null;
    isConfirmed: boolean;
    userId: number;
  }): Promise<void> {
    await this.repository.update(
      { id: userId },
      {
        emailConfirmationCode: code,
        emailConfirmationExpiresAt: expiresAt,
        emailIsConfirmed: isConfirmed,
      },
    );
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    await this.repository.update({ id: userId }, { passwordHash });
  }

  async updateRole(userId: number, role: UserRole): Promise<void> {
    await this.repository.update({ id: userId }, { role });
  }
}
