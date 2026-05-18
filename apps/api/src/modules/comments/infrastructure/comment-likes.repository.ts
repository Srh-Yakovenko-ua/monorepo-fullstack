import type { LikeStatus } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, type EntityManager, Repository } from "typeorm";

import { CommentLikeEntity, type CommentLikeStatus } from "../domain/comment-like.entity.js";

type CounterDelta = { dislikesDelta: number; likesDelta: number };

function resolveCounterDelta({
  newStatus,
  previousStatus,
}: {
  newStatus: LikeStatus;
  previousStatus: CommentLikeStatus | null;
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
export class CommentLikesRepository {
  constructor(
    @InjectRepository(CommentLikeEntity)
    private readonly repository: Repository<CommentLikeEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async applyLikeChange({
    commentId,
    newStatus,
    userId,
  }: {
    commentId: number;
    newStatus: LikeStatus;
    userId: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const previousStatus = await this.lockAndReadPreviousStatus({ commentId, manager, userId });
      if (previousStatus === newStatus) return;
      if (previousStatus === null && newStatus === "None") return;

      await this.applyLikeRowChange({ commentId, manager, newStatus, userId });

      const { dislikesDelta, likesDelta } = resolveCounterDelta({ newStatus, previousStatus });
      if (dislikesDelta === 0 && likesDelta === 0) return;

      await manager.query(
        `UPDATE comments
         SET likes_count = likes_count + $1,
             dislikes_count = dislikes_count + $2
         WHERE id = $3`,
        [likesDelta, dislikesDelta, commentId],
      );
    });
  }

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
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

    const entities = await this.repository
      .createQueryBuilder("commentLike")
      .select(["commentLike.commentId", "commentLike.status"])
      .where("commentLike.userId = :userId", { userId })
      .andWhere("commentLike.commentId IN (:...commentIds)", { commentIds })
      .getMany();

    for (const entity of entities) {
      result.set(entity.commentId, entity.status);
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
    const entity = await this.repository.findOne({
      select: ["status"],
      where: { commentId, userId },
    });
    return entity?.status ?? null;
  }

  private async applyLikeRowChange({
    commentId,
    manager,
    newStatus,
    userId,
  }: {
    commentId: number;
    manager: EntityManager;
    newStatus: LikeStatus;
    userId: number;
  }): Promise<void> {
    if (newStatus === "None") {
      await manager.query("DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2", [
        commentId,
        userId,
      ]);
      return;
    }
    await manager.query(
      `INSERT INTO comment_likes (comment_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (comment_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
      [commentId, userId, newStatus],
    );
  }

  private async lockAndReadPreviousStatus({
    commentId,
    manager,
    userId,
  }: {
    commentId: number;
    manager: EntityManager;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    const rows = await manager.query<{ status: CommentLikeStatus }[]>(
      "SELECT status FROM comment_likes WHERE comment_id = $1 AND user_id = $2 FOR UPDATE",
      [commentId, userId],
    );
    return rows[0]?.status ?? null;
  }
}
