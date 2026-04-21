import type { VideoDoc } from "../models/video.model.js";

import { VideoModel } from "../models/video.model.js";

export type VideoCreateInput = Omit<VideoDoc, "createdAt">;
export type VideoUpdateInput = Omit<VideoDoc, "_id" | "createdAt">;

export async function clearAll(): Promise<void> {
  await VideoModel.deleteMany({});
}

export async function create(input: VideoCreateInput): Promise<VideoDoc> {
  const doc = await VideoModel.create(input);
  return doc.toObject();
}

export async function findAll(): Promise<VideoDoc[]> {
  return VideoModel.find({}).lean();
}

export async function findById(id: number): Promise<null | VideoDoc> {
  return VideoModel.findById(id).lean();
}

export async function remove(id: number): Promise<boolean> {
  const result = await VideoModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(id: number, patch: VideoUpdateInput): Promise<null | VideoDoc> {
  return VideoModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
}
