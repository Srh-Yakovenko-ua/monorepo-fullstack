import type { CommentSortField, CommentsQuery } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type CommentDoc } from "../domain/comment.entity.js";

export type CommentCreateInput = Pick<
  CommentDoc,
  "commentatorUserId" | "commentatorUserLogin" | "content" | "postId"
>;

interface CommentRow {
  commentator_user_id: number;
  commentator_user_login: string;
  content: string;
  created_at: Date;
  dislikes_count: number;
  id: number;
  likes_count: number;
  post_id: number;
}

const COMMENT_SORT_COLUMN_BY_FIELD: Record<CommentSortField, string> = {
  createdAt: "created_at",
};

function mapRow(row: CommentRow): CommentDoc {
  return {
    commentatorUserId: row.commentator_user_id,
    commentatorUserLogin: row.commentator_user_login,
    content: row.content,
    createdAt: row.created_at,
    dislikesCount: row.dislikes_count,
    id: row.id,
    likesCount: row.likes_count,
    postId: row.post_id,
  };
}

@Injectable()
export class CommentsRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM comments");
  }

  async create(input: CommentCreateInput): Promise<CommentDoc> {
    const result = await this.pool.query<CommentRow>(
      `INSERT INTO comments (post_id, commentator_user_id, commentator_user_login, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.postId, input.commentatorUserId, input.commentatorUserLogin, input.content],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO comments did not return a row");
    return mapRow(row);
  }

  async findById(id: number): Promise<CommentDoc | null> {
    const result = await this.pool.query<CommentRow>("SELECT * FROM comments WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findByPostId(
    postId: number,
    query: CommentsQuery,
  ): Promise<{ items: CommentDoc[]; totalCount: number }> {
    const sortColumn = COMMENT_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;

    const [items, totalCount] = await Promise.all([
      this.pool
        .query<CommentRow>(
          `SELECT * FROM comments
           WHERE post_id = $1
           ORDER BY ${sortColumn} ${sortDirection}
           LIMIT $2 OFFSET $3`,
          [postId, query.pageSize, offset],
        )
        .then((result) => result.rows.map(mapRow)),
      this.pool
        .query<{
          count: string;
        }>("SELECT COUNT(*)::int AS count FROM comments WHERE post_id = $1", [postId])
        .then((result) => Number(result.rows[0]?.count ?? 0)),
    ]);

    return { items, totalCount };
  }

  async recomputeLikeCounters(commentId: number): Promise<void> {
    await this.pool.query(
      `UPDATE comments
       SET likes_count = (SELECT COUNT(*)::int FROM comment_likes WHERE comment_id = $1 AND status = 'Like'),
           dislikes_count = (SELECT COUNT(*)::int FROM comment_likes WHERE comment_id = $1 AND status = 'Dislike')
       WHERE id = $1`,
      [commentId],
    );
  }

  async remove(id: number): Promise<void> {
    await this.pool.query("DELETE FROM comments WHERE id = $1", [id]);
  }

  async updateContent(id: number, content: string): Promise<void> {
    await this.pool.query("UPDATE comments SET content = $1 WHERE id = $2", [content, id]);
  }
}
