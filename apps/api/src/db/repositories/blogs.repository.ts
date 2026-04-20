import type { BlogViewModel } from "@app/shared";

import { BlogModel } from "../models/blog.model.js";

export async function clearAll(): Promise<void> {
  await BlogModel.deleteMany({});
}

export async function create(
  input: Omit<BlogViewModel, "createdAt" | "id" | "isMembership">,
): Promise<BlogViewModel> {
  const doc = await BlogModel.create(input);
  return toViewModel(doc);
}

export async function findAll(): Promise<BlogViewModel[]> {
  const docs = await BlogModel.find({}).lean();
  return docs.map(toViewModel);
}

export async function findById(id: string): Promise<BlogViewModel | undefined> {
  const doc = await BlogModel.findById(id).lean();
  if (!doc) return undefined;
  return toViewModel(doc);
}

export async function remove(id: string): Promise<boolean> {
  const result = await BlogModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(
  id: string,
  patch: Pick<BlogViewModel, "description" | "name" | "websiteUrl">,
): Promise<BlogViewModel | undefined> {
  const doc = await BlogModel.findByIdAndUpdate(id, patch, { returnDocument: "after" });
  if (!doc) return undefined;
  return toViewModel(doc);
}

function toViewModel(doc: {
  _id: { toHexString(): string };
  createdAt: Date;
  description: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
}): BlogViewModel {
  return {
    createdAt: doc.createdAt.toISOString(),
    description: doc.description,
    id: doc._id.toHexString(),
    isMembership: doc.isMembership,
    name: doc.name,
    websiteUrl: doc.websiteUrl,
  };
}
