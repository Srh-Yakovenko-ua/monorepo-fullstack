import { Module } from "@nestjs/common";

import { VideosController } from "./videos.controller.js";
import { registerVideosOpenApi } from "./videos.openapi.js";
import { VideosService } from "./videos.service.js";

registerVideosOpenApi();

@Module({
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
