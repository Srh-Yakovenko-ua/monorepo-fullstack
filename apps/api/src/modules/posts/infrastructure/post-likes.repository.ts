import type { LikeStatus } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type PostLikeStatus } from "../domain/post-like.entity.js";

export type NewestLikeRow = {
  addedAt: Date;
  userId: number;
  userLogin: string;
};

interface NewestLikeQueryRow {
  created_at: Date;
  post_id: number;
  user_id: number;
  user_login: string;
}

interface PostLikeJoinRow {
  post_id: number;
  status: PostLikeStatus;
}

interface PostLikeStatusRow {
  status: PostLikeStatus;
}

const DEFAULT_NEWEST_LIKES_LIMIT = 3;

@Injectable()
export class PostLikesRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM post_likes");
  }

  async deleteAndReturnPreviousStatus({
    postId,
    userId,
  }: {
    postId: number;
    userId: number;
  }): Promise<null | PostLikeStatus> {
    const result = await this.pool.query<PostLikeStatusRow>(
      `DELETE FROM post_likes
       WHERE post_id = $1 AND user_id = $2
       RETURNING status`,
      [postId, userId],
    );
    const row = result.rows[0];
    return row?.status ?? null;
  }

  async findByPostIdsForUser({
    postIds,
    userId,
  }: {
    postIds: number[];
    userId: number;
  }): Promise<Map<number, LikeStatus>> {
    const result = new Map<number, LikeStatus>();
    if (postIds.length === 0) return result;
    const rows = await this.pool.query<PostLikeJoinRow>(
      `SELECT post_id, status
       FROM post_likes
       WHERE user_id = $1 AND post_id = ANY($2::int[])`,
      [userId, postIds],
    );
    for (const row of rows.rows) {
      result.set(row.post_id, row.status);
    }
    return result;
  }

  async findNewestLikesByPostIds({
    limit = DEFAULT_NEWEST_LIKES_LIMIT,
    postIds,
  }: {
    limit?: number;
    postIds: number[];
  }): Promise<Map<number, NewestLikeRow[]>> {
    const result = new Map<number, NewestLikeRow[]>();
    if (postIds.length === 0) return result;

    const rows = await this.pool.query<NewestLikeQueryRow>(
      `SELECT post_id, user_id, user_login, created_at
       FROM (
         SELECT
           post_id,
           user_id,
           user_login,
           created_at,
           ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at DESC) AS rn
         FROM post_likes
         WHERE post_id = ANY($1::int[]) AND status = 'Like'
       ) ranked
       WHERE rn <= $2
       ORDER BY post_id, created_at DESC`,
      [postIds, limit],
    );

    for (const row of rows.rows) {
      const list = result.get(row.post_id) ?? [];
      list.push({ addedAt: row.created_at, userId: row.user_id, userLogin: row.user_login });
      result.set(row.post_id, list);
    }
    return result;
  }

  async upsertAndReturnPreviousStatus({
    postId,
    status,
    userId,
    userLogin,
  }: {
    postId: number;
    status: PostLikeStatus;
    userId: number;
    userLogin: string;
  }): Promise<null | PostLikeStatus> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const previous = await client.query<PostLikeStatusRow>(
        "SELECT status FROM post_likes WHERE post_id = $1 AND user_id = $2 FOR UPDATE",
        [postId, userId],
      );
      await client.query(
        `INSERT INTO post_likes (post_id, user_id, user_login, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (post_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [postId, userId, userLogin, status],
      );
      await client.query("COMMIT");
      return previous.rows[0]?.status ?? null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
