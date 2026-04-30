import type {
  CommentsQuery,
  CommentUpdateInput,
  CommentViewModel,
  LikeStatus,
  Paginator,
} from "@app/shared";

import { Injectable } from "@nestjs/common";
import { isValidObjectId, Types } from "mongoose";

import type { CommentDoc } from "../../db/models/comment.model.js";

import * as commentLikesRepository from "../../db/repositories/comment-likes.repository.js";
import * as commentsRepository from "../../db/repositories/comments.repository.js";
import * as postsRepository from "../../db/repositories/posts.repository.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { buildPaginator } from "../../lib/paginator.js";

@Injectable()
export class CommentsService {
  async clearAllComments(): Promise<void> {
    await commentsRepository.clearAll();
    await commentLikesRepository.clearAll();
  }

  async createPostComment({
    currentUser,
    input,
    postId,
  }: {
    currentUser: { login: string; userId: string };
    input: CommentUpdateInput;
    postId: string;
  }): Promise<CommentViewModel> {
    await assertPostExists(postId);
    const doc = await commentsRepository.create({
      commentatorInfo: {
        userId: new Types.ObjectId(currentUser.userId),
        userLogin: currentUser.login,
      },
      content: input.content,
      postId: new Types.ObjectId(postId),
    });
    return mapToView({ doc, myStatus: "None" });
  }

  async deleteComment({
    commentId,
    currentUserId,
  }: {
    commentId: string;
    currentUserId: string;
  }): Promise<void> {
    assertValidId(commentId);
    const doc = await commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    if (doc.commentatorInfo.userId.toHexString() !== currentUserId) throw new ForbiddenError();
    await commentsRepository.remove(commentId);
  }

  async getCommentById({
    commentId,
    currentUserId,
  }: {
    commentId: string;
    currentUserId?: string;
  }): Promise<CommentViewModel> {
    assertValidId(commentId);
    const doc = await commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    const myStatus = await resolveMyStatus({ commentId, currentUserId });
    return mapToView({ doc, myStatus });
  }

  async listPostComments({
    currentUserId,
    postId,
    query,
  }: {
    currentUserId?: string;
    postId: string;
    query: CommentsQuery;
  }): Promise<Paginator<CommentViewModel>> {
    await assertPostExists(postId);
    const { items, totalCount } = await commentsRepository.findByPostId(postId, query);
    const myStatusByCommentId =
      currentUserId && items.length > 0
        ? await commentLikesRepository.findByCommentIdsForUser({
            commentIds: items.map((item) => item._id.toHexString()),
            userId: currentUserId,
          })
        : new Map<string, LikeStatus>();
    return buildPaginator({
      items: items.map((doc) =>
        mapToView({
          doc,
          myStatus: myStatusByCommentId.get(doc._id.toHexString()) ?? "None",
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
    commentId: string;
    currentUserId: string;
    newStatus: LikeStatus;
  }): Promise<void> {
    assertValidId(commentId);
    const doc = await commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });

    const previousPersistedStatus =
      newStatus === "None"
        ? await commentLikesRepository.deleteAndReturnPreviousStatus({
            commentId,
            userId: currentUserId,
          })
        : await commentLikesRepository.upsertAndReturnPreviousStatus({
            commentId,
            status: newStatus,
            userId: currentUserId,
          });

    const previousStatus: LikeStatus = previousPersistedStatus ?? "None";
    const { dislikesDelta, likesDelta } = computeCounterDelta({
      currentStatus: previousStatus,
      newStatus,
    });

    await commentsRepository.applyCounterDelta({ commentId, dislikesDelta, likesDelta });
  }

  async updateComment({
    commentId,
    currentUserId,
    input,
  }: {
    commentId: string;
    currentUserId: string;
    input: CommentUpdateInput;
  }): Promise<void> {
    assertValidId(commentId);
    const doc = await commentsRepository.findById(commentId);
    if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
    if (doc.commentatorInfo.userId.toHexString() !== currentUserId) throw new ForbiddenError();
    await commentsRepository.updateContent(commentId, input.content);
  }
}

async function assertPostExists(postId: string): Promise<void> {
  if (!isValidObjectId(postId)) throw new NotFoundError("Post not found", { bodyless: true });
  const post = await postsRepository.findById(postId);
  if (!post) throw new NotFoundError("Post not found", { bodyless: true });
}

function assertValidId(id: string): void {
  if (!isValidObjectId(id)) throw new NotFoundError("Comment not found", { bodyless: true });
}

function computeCounterDelta({
  currentStatus,
  newStatus,
}: {
  currentStatus: LikeStatus;
  newStatus: LikeStatus;
}): { dislikesDelta: number; likesDelta: number } {
  const likesDelta = (newStatus === "Like" ? 1 : 0) - (currentStatus === "Like" ? 1 : 0);
  const dislikesDelta = (newStatus === "Dislike" ? 1 : 0) - (currentStatus === "Dislike" ? 1 : 0);
  return { dislikesDelta, likesDelta };
}

function mapToView({ doc, myStatus }: { doc: CommentDoc; myStatus: LikeStatus }): CommentViewModel {
  return {
    commentatorInfo: {
      userId: doc.commentatorInfo.userId.toHexString(),
      userLogin: doc.commentatorInfo.userLogin,
    },
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    id: doc._id.toHexString(),
    likesInfo: {
      dislikesCount: doc.dislikesCount,
      likesCount: doc.likesCount,
      myStatus,
    },
  };
}

async function resolveMyStatus({
  commentId,
  currentUserId,
}: {
  commentId: string;
  currentUserId?: string;
}): Promise<LikeStatus> {
  if (!currentUserId) return "None";
  const status = await commentLikesRepository.findOne({ commentId, userId: currentUserId });
  return status ?? "None";
}
