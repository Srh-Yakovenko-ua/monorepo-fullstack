import type { CreateVideoInput, UpdateVideoInput, VideoViewModel } from "@app/shared";

import { addDays, parseISO } from "date-fns";

import type { VideoDoc } from "../db/models/video.model.js";

import * as videosRepository from "../db/repositories/videos.repository.js";
import { NotFoundError } from "../lib/errors.js";

export async function clearAllVideos(): Promise<void> {
  await videosRepository.clearAll();
}

export async function createVideo(input: CreateVideoInput): Promise<VideoViewModel> {
  const now = new Date();
  const doc = await videosRepository.create({
    _id: now.getTime(),
    author: input.author,
    availableResolutions: input.availableResolutions,
    canBeDownloaded: false,
    createdAt: now,
    minAgeRestriction: null,
    publicationDate: addDays(now, 1),
    title: input.title,
  });
  return toVideoView(doc);
}

export async function deleteVideo(id: number): Promise<void> {
  const removed = await videosRepository.remove(id);
  if (!removed) throw new NotFoundError(`Video with id ${id} not found`);
}

export async function getAllVideos(): Promise<VideoViewModel[]> {
  const docs = await videosRepository.findAll();
  return docs.map(toVideoView);
}

export async function getVideoById(id: number): Promise<VideoViewModel> {
  const doc = await videosRepository.findById(id);
  if (!doc) throw new NotFoundError(`Video with id ${id} not found`);
  return toVideoView(doc);
}

export function toVideoView(doc: VideoDoc): VideoViewModel {
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

export async function updateVideo(id: number, input: UpdateVideoInput): Promise<void> {
  const existing = await videosRepository.findById(id);
  if (!existing) throw new NotFoundError(`Video with id ${id} not found`);

  await videosRepository.update(id, {
    author: input.author,
    availableResolutions: input.availableResolutions,
    canBeDownloaded: input.canBeDownloaded,
    minAgeRestriction: input.minAgeRestriction,
    publicationDate: parseISO(input.publicationDate),
    title: input.title,
  });
}
