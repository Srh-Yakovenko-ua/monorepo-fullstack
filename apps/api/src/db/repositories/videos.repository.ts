import type { VideoResolution, VideoViewModel } from "@app/shared";

import { VideoModel } from "../models/video.model.js";

export async function clearAll(): Promise<void> {
  await VideoModel.deleteMany({});
}

export async function create(video: VideoViewModel): Promise<VideoViewModel> {
  const doc = await VideoModel.create({
    _id: video.id,
    author: video.author,
    availableResolutions: video.availableResolutions,
    canBeDownloaded: video.canBeDownloaded,
    createdAt: new Date(video.createdAt),
    minAgeRestriction: video.minAgeRestriction,
    publicationDate: new Date(video.publicationDate),
    title: video.title,
  });
  return toViewModel(doc);
}

export async function findAll(): Promise<VideoViewModel[]> {
  const docs = await VideoModel.find({}).lean();
  return docs.map(toViewModel);
}

export async function findById(id: number): Promise<undefined | VideoViewModel> {
  const doc = await VideoModel.findById(id).lean();
  if (!doc) return undefined;
  return toViewModel(doc);
}

export async function remove(id: number): Promise<boolean> {
  const result = await VideoModel.findByIdAndDelete(id);
  return result !== null;
}

export async function update(
  id: number,
  patch: Omit<VideoViewModel, "createdAt" | "id">,
): Promise<undefined | VideoViewModel> {
  const doc = await VideoModel.findByIdAndUpdate(
    id,
    {
      author: patch.author,
      availableResolutions: patch.availableResolutions,
      canBeDownloaded: patch.canBeDownloaded,
      minAgeRestriction: patch.minAgeRestriction,
      publicationDate: new Date(patch.publicationDate),
      title: patch.title,
    },
    { returnDocument: "after" },
  );
  if (!doc) return undefined;
  return toViewModel(doc);
}

function toViewModel(doc: {
  _id: number;
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: Date;
  minAgeRestriction: null | number;
  publicationDate: Date;
  title: string;
}): VideoViewModel {
  return {
    author: doc.author,
    availableResolutions: doc.availableResolutions,
    canBeDownloaded: doc.canBeDownloaded,
    createdAt: doc.createdAt.toISOString(),
    id: doc._id,
    minAgeRestriction: doc.minAgeRestriction,
    publicationDate: doc.publicationDate.toISOString(),
    title: doc.title,
  };
}
