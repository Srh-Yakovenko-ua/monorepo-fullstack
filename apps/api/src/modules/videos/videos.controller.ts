import type { CreateVideoInput, UpdateVideoInput, VideoViewModel } from "@app/shared";

import { CreateVideoInputSchema, UpdateVideoInputSchema } from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";

import { NotFoundError } from "../../lib/errors.js";
import { VideosService } from "./videos.service.js";
import { ZodBodyPipe } from "./zod-body.pipe.js";

@Controller("api/videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createVideo(
    @Body(new ZodBodyPipe(CreateVideoInputSchema)) body: CreateVideoInput,
  ): Promise<VideoViewModel> {
    return this.videosService.createVideo(body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVideo(@Param("id") rawId: string): Promise<void> {
    return this.videosService.deleteVideo(parseVideoId(rawId));
  }

  @Get(":id")
  getVideo(@Param("id") rawId: string): Promise<VideoViewModel> {
    return this.videosService.getVideoById(parseVideoId(rawId));
  }

  @Get()
  listVideos(): Promise<VideoViewModel[]> {
    return this.videosService.getAllVideos();
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updateVideo(
    @Param("id") rawId: string,
    @Body(new ZodBodyPipe(UpdateVideoInputSchema)) body: UpdateVideoInput,
  ): Promise<void> {
    return this.videosService.updateVideo(parseVideoId(rawId), body);
  }
}

function parseVideoId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new NotFoundError(`Video with id ${raw} not found`);
  return id;
}
