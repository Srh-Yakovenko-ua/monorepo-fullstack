import type { ApiErrorResult, VideoViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { CreateVideoInputSchema, UpdateVideoInputSchema } from "@app/shared";

import { NotFoundError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { mapZodError } from "../lib/zod-error.js";
import * as videosService from "../services/videos.service.js";

type IdParams = { id: string };
type UpdateReq = Request<IdParams, ApiErrorResult | void, unknown>;
type VideoListRes = Response<VideoViewModel[]>;
type VideoRes = Response<ApiErrorResult | VideoViewModel>;
type VideoWriteReq = Request<unknown, ApiErrorResult | VideoViewModel, unknown>;

export async function createVideo(req: VideoWriteReq, res: VideoRes): Promise<void> {
  const parsed = CreateVideoInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }

  const video = await videosService.createVideo(parsed.data);
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

export async function listVideos(_req: Request, res: VideoListRes): Promise<void> {
  res.status(HTTP_STATUS.OK).json(await videosService.getAllVideos());
}

export async function updateVideo(
  req: UpdateReq,
  res: Response<ApiErrorResult | void>,
): Promise<void> {
  const id = parseVideoId(req.params.id);

  const parsed = UpdateVideoInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }

  await videosService.updateVideo(id, parsed.data);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

function parseVideoId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new NotFoundError(`Video with id ${raw} not found`);
  return id;
}
