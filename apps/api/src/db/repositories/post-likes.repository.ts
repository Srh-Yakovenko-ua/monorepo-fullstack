import type { LikeStatus } from "@app/shared";

import { Types } from "mongoose";

import { PostLikeModel, type PostLikeStatus } from "../models/post-like.model.js";

export type NewestLikeRow = {
  addedAt: Date;
  userId: Types.ObjectId;
  userLogin: string;
};

const DEFAULT_NEWEST_LIKES_LIMIT = 3;

export async function clearAll(): Promise<void> {
  await PostLikeModel.deleteMany({});
}

export async function deleteAndReturnPreviousStatus({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<null | PostLikeStatus> {
  const previous = await PostLikeModel.findOneAndDelete({
    postId: new Types.ObjectId(postId),
    userId: new Types.ObjectId(userId),
  }).lean();
  return previous?.status ?? null;
}

export async function findByPostIdsForUser({
  postIds,
  userId,
}: {
  postIds: string[];
  userId: string;
}): Promise<Map<string, LikeStatus>> {
  if (postIds.length === 0) return new Map();
  const docs = await PostLikeModel.find({
    postId: { $in: postIds.map((id) => new Types.ObjectId(id)) },
    userId: new Types.ObjectId(userId),
  }).lean();
  const result = new Map<string, LikeStatus>();
  for (const doc of docs) {
    result.set(doc.postId.toHexString(), doc.status);
  }
  return result;
}

export async function findNewestLikesByPostIds({
  limit = DEFAULT_NEWEST_LIKES_LIMIT,
  postIds,
}: {
  limit?: number;
  postIds: string[];
}): Promise<Map<string, NewestLikeRow[]>> {
  const result = new Map<string, NewestLikeRow[]>();
  if (postIds.length === 0) return result;

  const objectIds = postIds.map((id) => new Types.ObjectId(id));
  const groups = await PostLikeModel.aggregate<{
    _id: Types.ObjectId;
    likes: { addedAt: Date; userId: Types.ObjectId; userLogin: string }[];
  }>([
    { $match: { postId: { $in: objectIds }, status: "Like" } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$postId",
        likes: { $push: { addedAt: "$createdAt", userId: "$userId", userLogin: "$userLogin" } },
      },
    },
    { $project: { likes: { $slice: ["$likes", limit] } } },
  ]);

  for (const group of groups) {
    result.set(group._id.toHexString(), group.likes);
  }
  return result;
}

export async function upsertAndReturnPreviousStatus({
  postId,
  status,
  userId,
  userLogin,
}: {
  postId: string;
  status: PostLikeStatus;
  userId: string;
  userLogin: string;
}): Promise<null | PostLikeStatus> {
  const previous = await PostLikeModel.findOneAndUpdate(
    {
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    },
    {
      $set: { status },
      $setOnInsert: {
        createdAt: new Date(),
        postId: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
        userLogin,
      },
    },
    { returnDocument: "before", upsert: true },
  ).lean();
  return previous?.status ?? null;
}
