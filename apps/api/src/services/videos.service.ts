import type { CreateVideoInput, UpdateVideoInput, VideoViewModel } from "@app/shared";

import * as videosRepository from "../db/repositories/videos.repository.js";
import { NotFoundError } from "../lib/errors.js";

export async function clearAllVideos(): Promise<void> {
  await videosRepository.clearAll();
}

export async function createVideo(input: CreateVideoInput): Promise<VideoViewModel> {
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const publicationDate = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const video: VideoViewModel = {
    author: input.author,
    availableResolutions: input.availableResolutions,
    canBeDownloaded: false,
    createdAt,
    id: now,
    minAgeRestriction: null,
    publicationDate,
    title: input.title,
  };

  return videosRepository.create(video);
}

export async function deleteVideo(id: number): Promise<void> {
  const removed = await videosRepository.remove(id);
  if (!removed) throw new NotFoundError(`Video with id ${id} not found`);
}

export async function getAllVideos(): Promise<VideoViewModel[]> {
  return videosRepository.findAll();
}

export async function getVideoById(id: number): Promise<VideoViewModel> {
  const video = await videosRepository.findById(id);
  if (!video) throw new NotFoundError(`Video with id ${id} not found`);
  return video;
}

export async function updateVideo(id: number, input: UpdateVideoInput): Promise<void> {
  const existing = await videosRepository.findById(id);
  if (!existing) throw new NotFoundError(`Video with id ${id} not found`);

  await videosRepository.update(id, {
    author: input.author,
    availableResolutions: input.availableResolutions,
    canBeDownloaded: input.canBeDownloaded,
    minAgeRestriction: input.minAgeRestriction,
    publicationDate: input.publicationDate,
    title: input.title,
  });
}
