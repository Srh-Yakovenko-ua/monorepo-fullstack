import { Module } from "@nestjs/common";

import { VideosModule } from "./modules/videos/videos.module.js";

@Module({
  imports: [VideosModule],
})
export class AppModule {}
