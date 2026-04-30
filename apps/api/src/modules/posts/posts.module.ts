import { Module } from "@nestjs/common";

import { CommentsModule } from "../comments/comments.module.js";
import { PostsController } from "./posts.controller.js";
import { registerPostsOpenApi } from "./posts.openapi.js";
import { PostsService } from "./posts.service.js";

registerPostsOpenApi();

@Module({
  controllers: [PostsController],
  exports: [PostsService],
  imports: [CommentsModule],
  providers: [PostsService],
})
export class PostsModule {}
