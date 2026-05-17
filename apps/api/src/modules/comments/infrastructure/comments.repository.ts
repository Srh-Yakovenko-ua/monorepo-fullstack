import type { CommentSortField, CommentsQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { type CommentDoc, CommentEntity } from "../domain/comment.entity.js";

export type CommentCreateInput = Pick<
  CommentDoc,
  "commentatorUserId" | "commentatorUserLogin" | "content" | "postId"
>;

const COMMENT_SORT_COLUMN_BY_FIELD: Record<CommentSortField, string> = {
  createdAt: "comment.createdAt",
};

function mapEntity(entity: CommentEntity): CommentDoc {
  return {
    commentatorUserId: entity.commentatorUserId,
    commentatorUserLogin: entity.commentatorUserLogin,
    content: entity.content,
    createdAt: entity.createdAt,
    dislikesCount: entity.dislikesCount,
    id: entity.id,
    likesCount: entity.likesCount,
    postId: entity.postId,
  };
}

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly repository: Repository<CommentEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: CommentCreateInput): Promise<CommentDoc> {
    const created = this.repository.create({
      commentatorUserId: input.commentatorUserId,
      commentatorUserLogin: input.commentatorUserLogin,
      content: input.content,
      postId: input.postId,
    });
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async findById(id: number): Promise<CommentDoc | null> {
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  async findByPostId(
    postId: number,
    query: CommentsQuery,
  ): Promise<{ items: CommentDoc[]; totalCount: number }> {
    const sortColumn = COMMENT_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;

    const [entities, totalCount] = await this.repository
      .createQueryBuilder("comment")
      .where("comment.postId = :postId", { postId })
      .orderBy(sortColumn, sortDirection)
      .limit(query.pageSize)
      .offset(offset)
      .getManyAndCount();

    return { items: entities.map(mapEntity), totalCount };
  }

  async recomputeLikeCounters(commentId: number): Promise<void> {
    await this.repository.query(
      `UPDATE comments
       SET likes_count = (SELECT COUNT(*)::int FROM comment_likes WHERE comment_id = $1 AND status = 'Like'),
           dislikes_count = (SELECT COUNT(*)::int FROM comment_likes WHERE comment_id = $1 AND status = 'Dislike')
       WHERE id = $1`,
      [commentId],
    );
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete({ id });
  }

  async updateContent(id: number, content: string): Promise<void> {
    await this.repository.update({ id }, { content });
  }
}
