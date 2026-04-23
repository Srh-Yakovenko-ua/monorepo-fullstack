import type { CommentsQuery, CommentUpdateInput, CommentViewModel, Paginator } from "@app/shared";

import { isValidObjectId, Types } from "mongoose";

import type { CommentDoc } from "../db/models/comment.model.js";

import * as commentsRepository from "../db/repositories/comments.repository.js";
import * as postsRepository from "../db/repositories/posts.repository.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { buildPaginator } from "../lib/paginator.js";

export async function clearAllComments(): Promise<void> {
  await commentsRepository.clearAll();
}

export async function createPostComment({
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
  return mapToView(doc);
}

export async function deleteComment({
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

export async function getCommentById(commentId: string): Promise<CommentViewModel> {
  assertValidId(commentId);
  const doc = await commentsRepository.findById(commentId);
  if (!doc) throw new NotFoundError("Comment not found", { bodyless: true });
  return mapToView(doc);
}

export async function listPostComments({
  postId,
  query,
}: {
  postId: string;
  query: CommentsQuery;
}): Promise<Paginator<CommentViewModel>> {
  await assertPostExists(postId);
  const { items, totalCount } = await commentsRepository.findByPostId(postId, query);
  return buildPaginator({
    items: items.map(mapToView),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export async function updateComment({
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

async function assertPostExists(postId: string): Promise<void> {
  if (!isValidObjectId(postId)) throw new NotFoundError("Post not found", { bodyless: true });
  const post = await postsRepository.findById(postId);
  if (!post) throw new NotFoundError("Post not found", { bodyless: true });
}

function assertValidId(id: string): void {
  if (!isValidObjectId(id)) throw new NotFoundError("Comment not found", { bodyless: true });
}

function mapToView(doc: CommentDoc): CommentViewModel {
  return {
    commentatorInfo: {
      userId: doc.commentatorInfo.userId.toHexString(),
      userLogin: doc.commentatorInfo.userLogin,
    },
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    id: doc._id.toHexString(),
  };
}
