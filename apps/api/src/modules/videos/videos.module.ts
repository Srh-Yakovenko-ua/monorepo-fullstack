import { Module } from "@nestjs/common";

import { VideosController } from "./api/videos.controller.js";
import { VideosService } from "./application/videos.service.js";
import { VideosRepository } from "./infrastructure/videos.repository.js";

@Module({
  controllers: [VideosController],
  exports: [VideosService, VideosRepository],
  providers: [VideosService, VideosRepository],
})
export class VideosModule {}
