import type { BlogsQuery } from "@app/shared";

import type { BlogDoc } from "../models/blog.model.js";

import { BlogModel } from "../models/blog.model.js";

export type BlogCreateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;
export type BlogLookupDoc = Pick<BlogDoc, "_id" | "name">;
export type BlogUpdateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;

export async function clearAll(): Promise<void> {
  await BlogModel.deleteMany({});
}

export async function create(input: BlogCreateInput): Promise<BlogDoc> {
  const doc = await BlogModel.create(input);
  return doc.toObject();
}

export async function findById(id: string): Promise<BlogDoc | null> {
  return BlogModel.findById(id).lean();
}

export async function findLookupPage(
  query: BlogsQuery,
): Promise<{ items: BlogLookupDoc[]; totalCount: number }> {
  const filter =
    query.searchNameTerm && query.searchNameTerm.length > 0
      ? { name: { $options: "i", $regex: query.searchNameTerm } }
      : {};

  const skip = (query.pageNumber - 1) * query.pageSize;
  const sortOrder = query.sortDirection === "asc" ? 1 : -1;

  const [items, totalCount] = await Promise.all([
    BlogModel.find(filter)
      .select({ _id: 1, name: 1 })
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    BlogModel.countDocuments(filter),
  ]);

  return { items, totalCount };
}

export async function findPage(
  query: BlogsQuery,
): Promise<{ items: BlogDoc[]; totalCount: number }> {
  const filter =
    query.searchNameTerm && query.searchNameTerm.length > 0
      ? { name: { $options: "i", $regex: query.searchNameTerm } }
      : {};

  const skip = (query.pageNumber - 1) * query.pageSize;
  const sortOrder = query.sortDirection === "asc" ? 1 : -1;

  const [items, totalCount] = await Promise.all([
    BlogModel.find(filter)
      .sort({ [query.sortBy]: sortOrder })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    BlogModel.countDocuments(filter),
  ]);

  return { items, totalCount };
}

export async function remove(id: string): Promise<boolean> {
  const result = await BlogModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(id: string, patch: BlogUpdateInput): Promise<BlogDoc | null> {
  return BlogModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
}
