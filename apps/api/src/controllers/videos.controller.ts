import type { CreateVideoInput, UpdateVideoInput, VideoViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { NotFoundError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import * as videosService from "../services/videos.service.js";

type CreateVideoReq = Request<unknown, unknown, CreateVideoInput>;
type IdParams = { id: string };
type UpdateVideoReq = Request<IdParams, unknown, UpdateVideoInput>;

export async function createVideo(
  req: CreateVideoReq,
  res: Response<VideoViewModel>,
): Promise<void> {
  const video = await videosService.createVideo(req.body);
  res.status(HTTP_STATUS.CREATED).json(video);
}

export async function deleteVideo(req: Request<IdParams>, res: Response<void>): Promise<void> {
  const id = parseVideoId(req.params.id);
  await videosService.deleteVideo(id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getVideo(
  req: Request<IdParams>,
  res: Response<VideoViewModel>,
): Promise<void> {
  const id = parseVideoId(req.params.id);
  const video = await videosService.getVideoById(id);
  res.status(HTTP_STATUS.OK).json(video);
}

export async function listVideos(_req: Request, res: Response<VideoViewModel[]>): Promise<void> {
  res.status(HTTP_STATUS.OK).json(await videosService.getAllVideos());
}

export async function updateVideo(req: UpdateVideoReq, res: Response<void>): Promise<void> {
  const id = parseVideoId(req.params.id);
  await videosService.updateVideo(id, req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

function parseVideoId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new NotFoundError(`Video with id ${raw} not found`);
  return id;
}
