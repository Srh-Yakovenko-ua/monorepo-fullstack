import { Module } from "@nestjs/common";

import { CommentsController } from "./comments.controller.js";
import { registerCommentsOpenApi } from "./comments.openapi.js";
import { CommentsService } from "./comments.service.js";

registerCommentsOpenApi();

@Module({
  controllers: [CommentsController],
  exports: [CommentsService],
  providers: [CommentsService],
})
export class CommentsModule {}
