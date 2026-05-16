import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../../core/database/postgres-pool.token.js";
import { type SessionDoc } from "../domain/session.entity.js";

export type SessionCreateInput = {
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: number;
};

interface SessionRow {
  device_id: string;
  expires_at: Date;
  id: number;
  ip: string;
  last_active_at: Date;
  title: string;
  token_jti: string;
  user_id: number;
}

function mapRow(row: SessionRow): SessionDoc {
  return {
    deviceId: row.device_id,
    expiresAt: row.expires_at,
    id: row.id,
    ip: row.ip,
    lastActiveAt: row.last_active_at,
    title: row.title,
    tokenJti: row.token_jti,
    userId: row.user_id,
  };
}

@Injectable()
export class SessionsRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM sessions");
  }

  async create(input: SessionCreateInput): Promise<SessionDoc> {
    const result = await this.pool.query<SessionRow>(
      `INSERT INTO sessions (
         user_id, device_id, token_jti, ip, title, last_active_at, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.userId,
        input.deviceId,
        input.tokenJti,
        input.ip,
        input.title,
        input.lastActiveAt,
        input.expiresAt,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO sessions did not return a row");
    return mapRow(row);
  }

  async deleteAllByUserExceptDevice({
    currentDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    userId: number;
  }): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE user_id = $1 AND device_id <> $2", [
      userId,
      currentDeviceId,
    ]);
  }

  async deleteByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: number;
  }): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM sessions WHERE user_id = $1 AND device_id = $2",
      [userId, deviceId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAllByUser(userId: number): Promise<SessionDoc[]> {
    const result = await this.pool.query<SessionRow>("SELECT * FROM sessions WHERE user_id = $1", [
      userId,
    ]);
    return result.rows.map(mapRow);
  }

  async findByDeviceId(deviceId: string): Promise<null | SessionDoc> {
    const result = await this.pool.query<SessionRow>(
      "SELECT * FROM sessions WHERE device_id = $1",
      [deviceId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: number;
  }): Promise<null | SessionDoc> {
    const result = await this.pool.query<SessionRow>(
      "SELECT * FROM sessions WHERE user_id = $1 AND device_id = $2",
      [userId, deviceId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async rotateSession({
    deviceId,
    expiresAt,
    ip,
    lastActiveAt,
    tokenJti,
    userId,
  }: {
    deviceId: string;
    expiresAt: Date;
    ip: string;
    lastActiveAt: Date;
    tokenJti: string;
    userId: number;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE sessions
       SET token_jti = $1, ip = $2, title = title, last_active_at = $3, expires_at = $4
       WHERE user_id = $5 AND device_id = $6`,
      [tokenJti, ip, lastActiveAt, expiresAt, userId, deviceId],
    );
  }
}
