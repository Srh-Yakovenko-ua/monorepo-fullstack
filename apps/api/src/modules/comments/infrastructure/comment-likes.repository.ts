import type { LikeStatus } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { CommentLikeEntity, type CommentLikeStatus } from "../domain/comment-like.entity.js";

@Injectable()
export class CommentLikesRepository {
  constructor(
    @InjectRepository(CommentLikeEntity)
    private readonly repository: Repository<CommentLikeEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async deleteAndReturnPreviousStatus({
    commentId,
    userId,
  }: {
    commentId: number;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    const rows = await this.repository.query<{ status: CommentLikeStatus }[]>(
      `DELETE FROM comment_likes
       WHERE comment_id = $1 AND user_id = $2
       RETURNING status`,
      [commentId, userId],
    );
    return rows[0]?.status ?? null;
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

  async upsertAndReturnPreviousStatus({
    commentId,
    status,
    userId,
  }: {
    commentId: number;
    status: CommentLikeStatus;
    userId: number;
  }): Promise<CommentLikeStatus | null> {
    return this.dataSource.transaction(async (manager) => {
      const previousRows = await manager.query<{ status: CommentLikeStatus }[]>(
        "SELECT status FROM comment_likes WHERE comment_id = $1 AND user_id = $2 FOR UPDATE",
        [commentId, userId],
      );
      await manager.query(
        `INSERT INTO comment_likes (comment_id, user_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (comment_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
        [commentId, userId, status],
      );
      return previousRows[0]?.status ?? null;
    });
  }
}
