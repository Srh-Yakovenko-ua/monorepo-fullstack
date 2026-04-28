import type { PaginationQuery } from "@app/shared";

import { Types } from "mongoose";

import type { PostDoc } from "../models/post.model.js";

import { PostModel } from "../models/post.model.js";

export type PostCreateInput = Pick<
  PostDoc,
  "blogId" | "blogName" | "content" | "shortDescription" | "title"
>;
export type PostFindPageQuery = PaginationQuery & { blogId?: string };
export type PostUpdateInput = PostCreateInput;

export async function applyCounterDelta({
  dislikesDelta,
  likesDelta,
  postId,
}: {
  dislikesDelta: number;
  likesDelta: number;
  postId: string;
}): Promise<void> {
  if (likesDelta === 0 && dislikesDelta === 0) return;
  await PostModel.updateOne(
    { _id: new Types.ObjectId(postId) },
    { $inc: { dislikesCount: dislikesDelta, likesCount: likesDelta } },
  );
}

export async function backfillMissingLikeCounters(): Promise<number> {
  const result = await PostModel.updateMany(
    {
      $or: [{ dislikesCount: { $exists: false } }, { likesCount: { $exists: false } }],
    },
    [
      {
        $set: {
          dislikesCount: { $ifNull: ["$dislikesCount", 0] },
          likesCount: { $ifNull: ["$likesCount", 0] },
        },
      },
    ],
  );
  return result.modifiedCount;
}

export async function clearAll(): Promise<void> {
  await PostModel.deleteMany({});
}

export async function create(input: PostCreateInput): Promise<PostDoc> {
  const doc = await PostModel.create(input);
  return doc.toObject();
}

export async function findById(id: string): Promise<null | PostDoc> {
  return PostModel.findById(id).lean();
}

export async function findPage(
  query: PostFindPageQuery,
): Promise<{ items: PostDoc[]; totalCount: number }> {
  const filter = query.blogId ? { blogId: query.blogId } : {};
  const skip = (query.pageNumber - 1) * query.pageSize;
  const sortOrder = query.sortDirection === "asc" ? 1 : -1;

  const [items, totalCount] = await Promise.all([
    PostModel.find(filter)
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    PostModel.countDocuments(filter),
  ]);

  return { items, totalCount };
}

export async function remove(id: string): Promise<boolean> {
  const result = await PostModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(id: string, patch: PostUpdateInput): Promise<null | PostDoc> {
  return PostModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
}
