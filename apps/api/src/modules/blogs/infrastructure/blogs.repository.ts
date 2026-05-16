import type { BlogSortField, BlogsQuery } from "@app/shared";

import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type BlogDoc } from "../domain/blog.entity.js";

export type BlogCreateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;
export type BlogLookupDoc = Pick<BlogDoc, "id" | "name">;
export type BlogUpdateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;

interface BlogLookupRow {
  id: number;
  name: string;
}

interface BlogRow {
  created_at: Date;
  description: string;
  id: number;
  is_membership: boolean;
  name: string;
  website_url: string;
}

const BLOG_SORT_COLUMN_BY_FIELD: Record<BlogSortField, string> = {
  createdAt: "created_at",
  name: "name",
};

function mapLookupRow(row: BlogLookupRow): BlogLookupDoc {
  return {
    id: row.id,
    name: row.name,
  };
}

function mapRow(row: BlogRow): BlogDoc {
  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isMembership: row.is_membership,
    name: row.name,
    websiteUrl: row.website_url,
  };
}

@Injectable()
export class BlogsRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM blogs");
  }

  async create(input: BlogCreateInput): Promise<BlogDoc> {
    const result = await this.pool.query<BlogRow>(
      `INSERT INTO blogs (name, description, website_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.name, input.description, input.websiteUrl],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO blogs did not return a row");
    return mapRow(row);
  }

  async findById(id: number): Promise<BlogDoc | null> {
    const result = await this.pool.query<BlogRow>("SELECT * FROM blogs WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async findLookupPage(query: BlogsQuery): Promise<{ items: BlogLookupDoc[]; totalCount: number }> {
    const sortColumn = BLOG_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const search = query.searchNameTerm?.length ? query.searchNameTerm : null;

    const [items, totalCount] = await Promise.all([
      this.pool
        .query<BlogLookupRow>(
          `SELECT id, name FROM blogs
           WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
           ORDER BY ${sortColumn} ${sortDirection}
           LIMIT $2 OFFSET $3`,
          [search, query.pageSize, offset],
        )
        .then((result) => result.rows.map(mapLookupRow)),
      this.pool
        .query<{ count: string }>(
          `SELECT COUNT(*)::int AS count FROM blogs
           WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')`,
          [search],
        )
        .then((result) => Number(result.rows[0]?.count ?? 0)),
    ]);

    return { items, totalCount };
  }

  async findPage(query: BlogsQuery): Promise<{ items: BlogDoc[]; totalCount: number }> {
    const sortColumn = BLOG_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const search = query.searchNameTerm?.length ? query.searchNameTerm : null;

    const [items, totalCount] = await Promise.all([
      this.pool
        .query<BlogRow>(
          `SELECT * FROM blogs
           WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
           ORDER BY ${sortColumn} ${sortDirection}
           LIMIT $2 OFFSET $3`,
          [search, query.pageSize, offset],
        )
        .then((result) => result.rows.map(mapRow)),
      this.pool
        .query<{ count: string }>(
          `SELECT COUNT(*)::int AS count FROM blogs
           WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')`,
          [search],
        )
        .then((result) => Number(result.rows[0]?.count ?? 0)),
    ]);

    return { items, totalCount };
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM blogs WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async update(id: number, patch: BlogUpdateInput): Promise<BlogDoc | null> {
    const result = await this.pool.query<BlogRow>(
      `UPDATE blogs
       SET name = $1, description = $2, website_url = $3
       WHERE id = $4
       RETURNING *`,
      [patch.name, patch.description, patch.websiteUrl, id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }
}
