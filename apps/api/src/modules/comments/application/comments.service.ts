import type {
  CommentsQuery,
  CommentUpdateInput,
  CommentViewModel,
  LikeStatus,
  Paginator,
} from "@app/shared";

import { Injectable } from "@nestjs/common";

import type { CommentDoc } from "../domain/comment.entity.js";

import { ForbiddenError, NotFoundError } from "../../../core/exceptions/errors.js";
import { buildPaginator } from "../../../core/paginator.js";
import { PostsRepository } from "../../posts/infrastructure/posts.repository.js";
import { CommentLikesRepository } from "../infrastructure/comment-likes.repository.js";
import { CommentsRepository } from "../infrastructure/comments.repository.js";

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly commentLikesRepository: CommentLikesRepository,
    private readonly postsRepository: PostsRepository,
  ) {}

  async clearAllComments(): Promise<void> {
    await this.commentLikesRepository.clearAll();
    await this.commentsRepository.clearAll();
  }

  async createPostComment({
    currentUser,
    input,
    postId,
  }: {
    currentUser: { login: string; userId: number };
    input: CommentUpdateInput;
    postId: number;
  }): Promise<CommentViewModel> {
    await this.assertPostExists(postId);
    const doc = await this.commentsRepository.create({
      commentatorUserId: currentUser.userId,
      commentatorUserLogin: currentUser.login,
      content: input.content,
      postId,
    });
    return mapToView({ doc, myStatus: "None" });
  }

  async deleteComment({
    commentId,
    currentUserId,
  }: {
    commentId: number;
    currentUserId: number;
  }): Promise<void> {
    const doc = await this.commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    if (doc.commentatorUserId !== currentUserId) throw new ForbiddenError();
    await this.commentsRepository.remove(commentId);
  }

  async getCommentById({
    commentId,
    currentUserId,
  }: {
    commentId: number;
    currentUserId?: number;
  }): Promise<CommentViewModel> {
    const doc = await this.commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    const myStatus = await this.resolveMyStatus({ commentId, currentUserId });
    return mapToView({ doc, myStatus });
  }

  async listPostComments({
    currentUserId,
    postId,
    query,
  }: {
    currentUserId?: number;
    postId: number;
    query: CommentsQuery;
  }): Promise<Paginator<CommentViewModel>> {
    await this.assertPostExists(postId);
    const { items, totalCount } = await this.commentsRepository.findByPostId(postId, query);
    const myStatusByCommentId =
      currentUserId !== undefined && items.length > 0
        ? await this.commentLikesRepository.findByCommentIdsForUser({
            commentIds: items.map((item) => item.id),
            userId: currentUserId,
          })
        : new Map<number, LikeStatus>();
    return buildPaginator({
      items: items.map((doc) =>
        mapToView({
          doc,
          myStatus: myStatusByCommentId.get(doc.id) ?? "None",
        }),
      ),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async setLikeStatus({
    commentId,
    currentUserId,
    newStatus,
  }: {
    commentId: number;
    currentUserId: number;
    newStatus: LikeStatus;
  }): Promise<void> {
    const doc = await this.commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });

    await this.commentLikesRepository.applyLikeChange({
      commentId,
      newStatus,
      userId: currentUserId,
    });
  }

  async updateComment({
    commentId,
    currentUserId,
    input,
  }: {
    commentId: number;
    currentUserId: number;
    input: CommentUpdateInput;
  }): Promise<void> {
    const doc = await this.commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    if (doc.commentatorUserId !== currentUserId) throw new ForbiddenError();
    await this.commentsRepository.updateContent(commentId, input.content);
  }

  private async assertPostExists(postId: number): Promise<void> {
    const post = await this.postsRepository.findById(postId);
    if (!post) throw new NotFoundError("Post not found", { bodyless: true });
  }

  private async resolveMyStatus({
    commentId,
    currentUserId,
  }: {
    commentId: number;
    currentUserId?: number;
  }): Promise<LikeStatus> {
    if (currentUserId === undefined) return "None";
    const status = await this.commentLikesRepository.findOne({ commentId, userId: currentUserId });
    return status ?? "None";
  }
}

function mapToView({ doc, myStatus }: { doc: CommentDoc; myStatus: LikeStatus }): CommentViewModel {
  return {
    commentatorInfo: {
      userId: doc.commentatorUserId,
      userLogin: doc.commentatorUserLogin,
    },
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    id: doc.id,
    likesInfo: {
      dislikesCount: doc.dislikesCount,
      likesCount: doc.likesCount,
      myStatus,
    },
  };
}
