import type { CommentsQuery } from "@app/shared";

import { Types } from "mongoose";

import { type CommentDoc, CommentModel } from "../models/comment.model.js";

export type CommentCreateInput = Pick<CommentDoc, "commentatorInfo" | "content" | "postId">;

export async function clearAll(): Promise<void> {
  await CommentModel.deleteMany({});
}

export async function create(input: CommentCreateInput): Promise<CommentDoc> {
  const doc = await CommentModel.create(input);
  return doc.toObject();
}

export async function findById(id: string): Promise<CommentDoc | null> {
  return CommentModel.findById(id).lean();
}

export async function findByPostId(
  postId: string,
  query: CommentsQuery,
): Promise<{ items: CommentDoc[]; totalCount: number }> {
  const filter = { postId: new Types.ObjectId(postId) };
  const skip = (query.pageNumber - 1) * query.pageSize;
  const sortOrder = query.sortDirection === "asc" ? 1 : -1;
  const [items, totalCount] = await Promise.all([
    CommentModel.find(filter)
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    CommentModel.countDocuments(filter),
  ]);
  return { items, totalCount };
}

export async function remove(id: string): Promise<void> {
  await CommentModel.findByIdAndDelete(id);
}

export async function updateContent(id: string, content: string): Promise<void> {
  await CommentModel.findByIdAndUpdate(id, { content });
}
