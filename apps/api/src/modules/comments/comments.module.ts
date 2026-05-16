import { Module } from "@nestjs/common";

import { PostsModule } from "../posts/posts.module.js";
import { CommentsController } from "./api/comments.controller.js";
import { PostCommentsController } from "./api/post-comments.controller.js";
import { CommentsService } from "./application/comments.service.js";
import { CommentLikesRepository } from "./infrastructure/comment-likes.repository.js";
import { CommentsRepository } from "./infrastructure/comments.repository.js";

@Module({
  controllers: [CommentsController, PostCommentsController],
  exports: [CommentsService, CommentsRepository, CommentLikesRepository],
  imports: [PostsModule],
  providers: [CommentsService, CommentsRepository, CommentLikesRepository],
})
export class CommentsModule {}
