import type { LikeStatus } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type CommentLikeStatus } from "../domain/comment-like.entity.js";

interface CommentLikeJoinRow {
  comment_id: number;
  status: CommentLikeStatus;
}

interface CommentLikeStatusRow {
  status: CommentLikeStatus;
}

@Injectable()
export class CommentLikesRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM comment_likes");
  }

  async deleteAndReturnPreviousStatus({
    commentId,
    userId,
  }: {
    commentId: number;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    const result = await this.pool.query<CommentLikeStatusRow>(
      `DELETE FROM comment_likes
       WHERE comment_id = $1 AND user_id = $2
       RETURNING status`,
      [commentId, userId],
    );
    const row = result.rows[0];
    return row?.status ?? null;
  }

  async findByCommentIdsForUser({
    commentIds,
    userId,
  }: {
    commentIds: number[];
    userId: number;
  }): Promise<Map<number, LikeStatus>> {
    const result = new Map<number, LikeStatus>();
    if (commentIds.length === 0) return result;
    const rows = await this.pool.query<CommentLikeJoinRow>(
      `SELECT comment_id, status
       FROM comment_likes
       WHERE user_id = $1 AND comment_id = ANY($2::int[])`,
      [userId, commentIds],
    );
    for (const row of rows.rows) {
      result.set(row.comment_id, row.status);
    }
    return result;
  }

  async findOne({
    commentId,
    userId,
  }: {
    commentId: number;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    const result = await this.pool.query<CommentLikeStatusRow>(
      "SELECT status FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
      [commentId, userId],
    );
    const row = result.rows[0];
    return row?.status ?? null;
  }

  async upsertAndReturnPreviousStatus({
    commentId,
    status,
    userId,
  }: {
    commentId: number;
    status: CommentLikeStatus;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const previous = await client.query<CommentLikeStatusRow>(
        "SELECT status FROM comment_likes WHERE comment_id = $1 AND user_id = $2 FOR UPDATE",
        [commentId, userId],
      );
      await client.query(
        `INSERT INTO comment_likes (comment_id, user_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (comment_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [commentId, userId, status],
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
