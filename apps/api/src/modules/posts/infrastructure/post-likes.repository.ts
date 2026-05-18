import type { LikeStatus } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, type EntityManager, Repository } from "typeorm";

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

type CounterDelta = { dislikesDelta: number; likesDelta: number };

function resolveCounterDelta({
  newStatus,
  previousStatus,
}: {
  newStatus: LikeStatus;
  previousStatus: null | PostLikeStatus;
}): CounterDelta {
  const previousLikeWeight = previousStatus === "Like" ? 1 : 0;
  const previousDislikeWeight = previousStatus === "Dislike" ? 1 : 0;
  const nextLikeWeight = newStatus === "Like" ? 1 : 0;
  const nextDislikeWeight = newStatus === "Dislike" ? 1 : 0;
  return {
    dislikesDelta: nextDislikeWeight - previousDislikeWeight,
    likesDelta: nextLikeWeight - previousLikeWeight,
  };
}

@Injectable()
export class PostLikesRepository {
  constructor(
    @InjectRepository(PostLikeEntity)
    private readonly repository: Repository<PostLikeEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async applyLikeChange({
    newStatus,
    postId,
    userId,
    userLogin,
  }: {
    newStatus: LikeStatus;
    postId: number;
    userId: number;
    userLogin: string;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const previousStatus = await this.lockAndReadPreviousStatus({ manager, postId, userId });
      if (previousStatus === newStatus) return;
      if (previousStatus === null && newStatus === "None") return;

      await this.applyLikeRowChange({ manager, newStatus, postId, userId, userLogin });

      const { dislikesDelta, likesDelta } = resolveCounterDelta({ newStatus, previousStatus });
      if (dislikesDelta === 0 && likesDelta === 0) return;

      await manager.query(
        `UPDATE posts
         SET likes_count = likes_count + $1,
             dislikes_count = dislikes_count + $2
         WHERE id = $3`,
        [likesDelta, dislikesDelta, postId],
      );
    });
  }

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
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

  private async applyLikeRowChange({
    manager,
    newStatus,
    postId,
    userId,
    userLogin,
  }: {
    manager: EntityManager;
    newStatus: LikeStatus;
    postId: number;
    userId: number;
    userLogin: string;
  }): Promise<void> {
    if (newStatus === "None") {
      await manager.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [
        postId,
        userId,
      ]);
      return;
    }
    await manager.query(
      `INSERT INTO post_likes (post_id, user_id, user_login, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (post_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
      [postId, userId, userLogin, newStatus],
    );
  }

  private async lockAndReadPreviousStatus({
    manager,
    postId,
    userId,
  }: {
    manager: EntityManager;
    postId: number;
    userId: number;
  }): Promise<null | PostLikeStatus> {
    const rows = await manager.query<{ status: PostLikeStatus }[]>(
      "SELECT status FROM post_likes WHERE post_id = $1 AND user_id = $2 FOR UPDATE",
      [postId, userId],
    );
    return rows[0]?.status ?? null;
  }
}
