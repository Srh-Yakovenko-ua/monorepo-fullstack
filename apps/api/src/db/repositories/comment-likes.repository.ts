import type { LikeStatus } from "@app/shared";

import { Types } from "mongoose";

import { CommentLikeModel, type CommentLikeStatus } from "../models/comment-like.model.js";

export async function clearAll(): Promise<void> {
  await CommentLikeModel.deleteMany({});
}

export async function deleteAndReturnPreviousStatus({
  commentId,
  userId,
}: {
  commentId: string;
  userId: string;
}): Promise<CommentLikeStatus | null> {
  const previous = await CommentLikeModel.findOneAndDelete({
    commentId: new Types.ObjectId(commentId),
    userId: new Types.ObjectId(userId),
  }).lean();
  return previous?.status ?? null;
}

export async function findByCommentIdsForUser({
  commentIds,
  userId,
}: {
  commentIds: string[];
  userId: string;
}): Promise<Map<string, LikeStatus>> {
  if (commentIds.length === 0) return new Map();
  const docs = await CommentLikeModel.find({
    commentId: { $in: commentIds.map((id) => new Types.ObjectId(id)) },
    userId: new Types.ObjectId(userId),
  }).lean();
  const result = new Map<string, LikeStatus>();
  for (const doc of docs) {
    result.set(doc.commentId.toHexString(), doc.status);
  }
  return result;
}

export async function findOne({
  commentId,
  userId,
}: {
  commentId: string;
  userId: string;
}): Promise<CommentLikeStatus | null> {
  const doc = await CommentLikeModel.findOne({
    commentId: new Types.ObjectId(commentId),
    userId: new Types.ObjectId(userId),
  }).lean();
  return doc?.status ?? null;
}

export async function upsertAndReturnPreviousStatus({
  commentId,
  status,
  userId,
}: {
  commentId: string;
  status: CommentLikeStatus;
  userId: string;
}): Promise<CommentLikeStatus | null> {
  const previous = await CommentLikeModel.findOneAndUpdate(
    {
      commentId: new Types.ObjectId(commentId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { status },
      $setOnInsert: {
        commentId: new Types.ObjectId(commentId),
        createdAt: new Date(),
        userId: new Types.ObjectId(userId),
      },
    },
    { returnDocument: "before", upsert: true },
  ).lean();
  return previous?.status ?? null;
}
