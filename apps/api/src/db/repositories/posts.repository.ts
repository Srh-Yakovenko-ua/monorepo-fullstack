import type { PostViewModel } from "@app/shared";

import { PostModel } from "../models/post.model.js";

export async function clearAll(): Promise<void> {
  await PostModel.deleteMany({});
}

export async function create(
  input: Omit<PostViewModel, "createdAt" | "id">,
): Promise<PostViewModel> {
  const doc = await PostModel.create(input);
  return toViewModel(doc);
}

export async function findAll(): Promise<PostViewModel[]> {
  const docs = await PostModel.find({}).lean();
  return docs.map(toViewModel);
}

export async function findById(id: string): Promise<PostViewModel | undefined> {
  const doc = await PostModel.findById(id).lean();
  if (!doc) return undefined;
  return toViewModel(doc);
}

export async function remove(id: string): Promise<boolean> {
  const result = await PostModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(
  id: string,
  patch: Pick<PostViewModel, "blogId" | "blogName" | "content" | "shortDescription" | "title">,
): Promise<PostViewModel | undefined> {
  const doc = await PostModel.findByIdAndUpdate(id, patch, { returnDocument: "after" });
  if (!doc) return undefined;
  return toViewModel(doc);
}

function toViewModel(doc: {
  _id: { toHexString(): string };
  blogId: string;
  blogName: string;
  content: string;
  createdAt: Date;
  shortDescription: string;
  title: string;
}): PostViewModel {
  return {
    blogId: doc.blogId,
    blogName: doc.blogName,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    id: doc._id.toHexString(),
    shortDescription: doc.shortDescription,
    title: doc.title,
  };
}
