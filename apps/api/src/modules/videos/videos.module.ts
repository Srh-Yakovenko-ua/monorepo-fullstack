import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { VideosController } from "./api/videos.controller.js";
import { VideosService } from "./application/videos.service.js";
import { Video, VideoSchema } from "./domain/video.entity.js";
import { VideosRepository } from "./infrastructure/videos.repository.js";

@Module({
  controllers: [VideosController],
  exports: [VideosService, VideosRepository, MongooseModule],
  imports: [MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }])],
  providers: [VideosService, VideosRepository],
})
export class VideosModule {}
