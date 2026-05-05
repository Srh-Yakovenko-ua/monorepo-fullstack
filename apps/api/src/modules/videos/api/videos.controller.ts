import type { VideoViewModel } from "@app/shared";

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
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { NotFoundError } from "../../../core/exceptions/errors.js";
import { ZodBodyPipe } from "../../../core/pipes/zod-body.pipe.js";
import { VideosService } from "../application/videos.service.js";
import { CreateVideoInputDto } from "./input-dto/create-video-input.dto.js";
import { UpdateVideoInputDto } from "./input-dto/update-video-input.dto.js";

@ApiTags("Videos")
@Controller("api/videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @ApiBody({ type: CreateVideoInputDto })
  @ApiOperation({ summary: "Create a video" })
  @ApiResponse({ description: "Video created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  createVideo(
    @Body(new ZodBodyPipe(CreateVideoInputSchema)) body: CreateVideoInputDto,
  ): Promise<VideoViewModel> {
    return this.videosService.createVideo(body);
  }

  @ApiOperation({ summary: "Delete a video by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Video deleted", status: 204 })
  @ApiResponse({ description: "Video not found", status: 404 })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVideo(@Param("id") rawId: string): Promise<void> {
    return this.videosService.deleteVideo(parseVideoId(rawId));
  }

  @ApiOperation({ summary: "Get a video by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Video found", status: 200 })
  @ApiResponse({ description: "Video not found", status: 404 })
  @Get(":id")
  getVideo(@Param("id") rawId: string): Promise<VideoViewModel> {
    return this.videosService.getVideoById(parseVideoId(rawId));
  }

  @ApiOperation({ summary: "List all videos" })
  @ApiResponse({ description: "List of all videos", status: 200 })
  @Get()
  listVideos(): Promise<VideoViewModel[]> {
    return this.videosService.getAllVideos();
  }

  @ApiBody({ type: UpdateVideoInputDto })
  @ApiOperation({ summary: "Update a video by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Video updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Video not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updateVideo(
    @Param("id") rawId: string,
    @Body(new ZodBodyPipe(UpdateVideoInputSchema)) body: UpdateVideoInputDto,
  ): Promise<void> {
    return this.videosService.updateVideo(parseVideoId(rawId), body);
  }
}

function parseVideoId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new NotFoundError(`Video with id ${raw} not found`);
  return id;
}
