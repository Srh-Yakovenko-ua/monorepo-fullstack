import type { LikeStatus } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { PostLikeEntity, type PostLikeStatus } from "../domain/post-like.entity.js";

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

const DEFAULT_NEWEST_LIKES_LIMIT = 3;

@Injectable()
export class PostLikesRepository {
  constructor(
    @InjectRepository(PostLikeEntity)
    private readonly repository: Repository<PostLikeEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async deleteAndReturnPreviousStatus({
    postId,
    userId,
  }: {
    postId: number;
    userId: number;
  }): Promise<null | PostLikeStatus> {
    const rows = await this.repository.query<{ status: PostLikeStatus }[]>(
      `DELETE FROM post_likes
       WHERE post_id = $1 AND user_id = $2
       RETURNING status`,
      [postId, userId],
    );
    return rows[0]?.status ?? null;
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

    const entities = await this.repository
      .createQueryBuilder("postLike")
      .select(["postLike.postId", "postLike.status"])
      .where("postLike.userId = :userId", { userId })
      .andWhere("postLike.postId IN (:...postIds)", { postIds })
      .getMany();

    for (const entity of entities) {
      result.set(entity.postId, entity.status);
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

    const rows = await this.repository.query<NewestLikeQueryRow[]>(
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

    for (const row of rows) {
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
    return this.dataSource.transaction(async (manager) => {
      const previousRows = await manager.query<{ status: PostLikeStatus }[]>(
        "SELECT status FROM post_likes WHERE post_id = $1 AND user_id = $2 FOR UPDATE",
        [postId, userId],
      );
      await manager.query(
        `INSERT INTO post_likes (post_id, user_id, user_login, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (post_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [postId, userId, userLogin, status],
      );
      return previousRows[0]?.status ?? null;
    });
  }
}
