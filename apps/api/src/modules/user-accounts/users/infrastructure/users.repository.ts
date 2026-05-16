import type { UserRole, UserSortField, UsersQuery } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../../core/database/postgres-pool.token.js";
import { type UserDoc } from "../domain/user.entity.js";

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

interface UserRow {
  created_at: Date;
  email: string;
  email_confirmation_code: null | string;
  email_confirmation_expires_at: Date | null;
  email_is_confirmed: boolean;
  id: number;
  login: string;
  password_hash: string;
  password_recovery_code: null | string;
  password_recovery_expires_at: Date | null;
  role: UserRole;
}

const USER_SORT_COLUMN_BY_FIELD: Record<UserSortField, string> = {
  createdAt: "created_at",
  email: "email",
  login: "login",
};

function mapRow(row: UserRow): UserDoc {
  return {
    createdAt: row.created_at,
    email: row.email,
    emailConfirmationCode: row.email_confirmation_code,
    emailConfirmationExpiresAt: row.email_confirmation_expires_at,
    emailIsConfirmed: row.email_is_confirmed,
    id: row.id,
    login: row.login,
    passwordHash: row.password_hash,
    passwordRecoveryCode: row.password_recovery_code,
    passwordRecoveryExpiresAt: row.password_recovery_expires_at,
    role: row.role,
  };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async atomicResetPassword({
    newPasswordHash,
    now,
    recoveryCode,
  }: {
    newPasswordHash: string;
    now: Date;
    recoveryCode: string;
  }): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET password_hash = $1,
           password_recovery_code = NULL,
           password_recovery_expires_at = NULL
       WHERE password_recovery_code = $2
         AND password_recovery_expires_at > $3
       RETURNING *`,
      [newPasswordHash, recoveryCode, now],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM users");
  }

  async create(input: UserCreateInput): Promise<UserDoc> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (
         email, login, password_hash, role,
         email_confirmation_code, email_confirmation_expires_at, email_is_confirmed
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.email,
        input.login,
        input.passwordHash,
        input.role,
        input.emailConfirmationCode,
        input.emailConfirmationExpiresAt,
        input.emailIsConfirmed,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO users did not return a row");
    return mapRow(row);
  }

  async findByEmail(email: string): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findByEmailConfirmationCode(code: string): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>(
      "SELECT * FROM users WHERE email_confirmation_code = $1",
      [code],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findById(id: number): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findByLogin(login: string): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>("SELECT * FROM users WHERE login = $1", [login]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<null | UserDoc> {
    const result = await this.pool.query<UserRow>(
      "SELECT * FROM users WHERE email = $1 OR login = $1",
      [loginOrEmail],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findPage(query: UsersQuery): Promise<{ items: UserDoc[]; totalCount: number }> {
    const sortColumn = USER_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const loginSearch = query.searchLoginTerm?.length ? query.searchLoginTerm : null;
    const emailSearch = query.searchEmailTerm?.length ? query.searchEmailTerm : null;

    const whereClause = `
      WHERE (
        ($1::text IS NULL AND $2::text IS NULL)
        OR ($1::text IS NOT NULL AND login ILIKE '%' || $1 || '%')
        OR ($2::text IS NOT NULL AND email ILIKE '%' || $2 || '%')
      )
    `;

    const [items, totalCount] = await Promise.all([
      this.pool
        .query<UserRow>(
          `SELECT * FROM users ${whereClause}
           ORDER BY ${sortColumn} ${sortDirection}
           LIMIT $3 OFFSET $4`,
          [loginSearch, emailSearch, query.pageSize, offset],
        )
        .then((result) => result.rows.map(mapRow)),
      this.pool
        .query<{
          count: string;
        }>(`SELECT COUNT(*)::int AS count FROM users ${whereClause}`, [loginSearch, emailSearch])
        .then((result) => Number(result.rows[0]?.count ?? 0)),
    ]);

    return { items, totalCount };
  }

  async markEmailConfirmed(userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET email_is_confirmed = TRUE,
           email_confirmation_code = NULL,
           email_confirmation_expires_at = NULL
       WHERE id = $1`,
      [userId],
    );
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
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
    await this.pool.query(
      `UPDATE users
       SET password_recovery_code = $1,
           password_recovery_expires_at = $2
       WHERE id = $3`,
      [code, expiresAt, userId],
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
    await this.pool.query(
      `UPDATE users
       SET email_confirmation_code = $1,
           email_confirmation_expires_at = $2,
           email_is_confirmed = $3
       WHERE id = $4`,
      [code, expiresAt, isConfirmed, userId],
    );
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    await this.pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      userId,
    ]);
  }

  async updateRole(userId: number, role: UserRole): Promise<void> {
    await this.pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);
  }
}
