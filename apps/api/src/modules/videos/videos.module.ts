import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VideosController } from "./api/videos.controller.js";
import { VideosService } from "./application/videos.service.js";
import { VideoEntity } from "./domain/video.entity.js";
import { VideosRepository } from "./infrastructure/videos.repository.js";

@Module({
  controllers: [VideosController],
  exports: [VideosService, VideosRepository],
  imports: [TypeOrmModule.forFeature([VideoEntity])],
  providers: [VideosService, VideosRepository],
})
export class VideosModule {}
