import type { PaginationQuery, PostSortField } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type PostDoc } from "../domain/post.entity.js";

export type PostCreateInput = Pick<
  PostDoc,
  "blogId" | "blogName" | "content" | "shortDescription" | "title"
>;
export type PostFindPageQuery = PaginationQuery & { blogId?: number };
export type PostUpdateInput = PostCreateInput;

interface PostRow {
  blog_id: number;
  blog_name: string;
  content: string;
  created_at: Date;
  dislikes_count: number;
  id: number;
  likes_count: number;
  short_description: string;
  title: string;
}

const POST_SORT_COLUMN_BY_FIELD: Record<PostSortField, string> = {
  blogName: "blog_name",
  createdAt: "created_at",
  title: "title",
};

function mapRow(row: PostRow): PostDoc {
  return {
    blogId: row.blog_id,
    blogName: row.blog_name,
    content: row.content,
    createdAt: row.created_at,
    dislikesCount: row.dislikes_count,
    id: row.id,
    likesCount: row.likes_count,
    shortDescription: row.short_description,
    title: row.title,
  };
}

@Injectable()
export class PostsRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM posts");
  }

  async create(input: PostCreateInput): Promise<PostDoc> {
    const result = await this.pool.query<PostRow>(
      `INSERT INTO posts (blog_id, blog_name, title, short_description, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.blogId, input.blogName, input.title, input.shortDescription, input.content],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO posts did not return a row");
    return mapRow(row);
  }

  async findById(id: number): Promise<null | PostDoc> {
    const result = await this.pool.query<PostRow>("SELECT * FROM posts WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findPage(query: PostFindPageQuery): Promise<{ items: PostDoc[]; totalCount: number }> {
    const sortColumn = POST_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const blogIdFilter = query.blogId ?? null;

    const [items, totalCount] = await Promise.all([
      this.pool
        .query<PostRow>(
          `SELECT * FROM posts
           WHERE ($1::int IS NULL OR blog_id = $1)
           ORDER BY ${sortColumn} ${sortDirection}
           LIMIT $2 OFFSET $3`,
          [blogIdFilter, query.pageSize, offset],
        )
        .then((result) => result.rows.map(mapRow)),
      this.pool
        .query<{ count: string }>(
          `SELECT COUNT(*)::int AS count FROM posts
           WHERE ($1::int IS NULL OR blog_id = $1)`,
          [blogIdFilter],
        )
        .then((result) => Number(result.rows[0]?.count ?? 0)),
    ]);

    return { items, totalCount };
  }

  async recomputeLikeCounters(postId: number): Promise<void> {
    await this.pool.query(
      `UPDATE posts
       SET likes_count = (SELECT COUNT(*)::int FROM post_likes WHERE post_id = $1 AND status = 'Like'),
           dislikes_count = (SELECT COUNT(*)::int FROM post_likes WHERE post_id = $1 AND status = 'Dislike')
       WHERE id = $1`,
      [postId],
    );
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM posts WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async update(id: number, patch: PostUpdateInput): Promise<null | PostDoc> {
    const result = await this.pool.query<PostRow>(
      `UPDATE posts
       SET blog_id = $1, blog_name = $2, title = $3, short_description = $4, content = $5
       WHERE id = $6
       RETURNING *`,
      [patch.blogId, patch.blogName, patch.title, patch.shortDescription, patch.content, id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }
}
