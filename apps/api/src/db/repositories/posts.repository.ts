import type { PaginationQuery } from "@app/shared";

import type { PostDoc } from "../models/post.model.js";

import { PostModel } from "../models/post.model.js";

export type PostCreateInput = Pick<
  PostDoc,
  "blogId" | "blogName" | "content" | "shortDescription" | "title"
>;
export type PostFindPageQuery = PaginationQuery & { blogId?: string };
export type PostUpdateInput = PostCreateInput;

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
