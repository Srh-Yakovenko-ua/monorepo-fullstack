import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PostsModule } from "../posts/posts.module.js";
import { CommentsController } from "./api/comments.controller.js";
import { PostCommentsController } from "./api/post-comments.controller.js";
import { CommentsService } from "./application/comments.service.js";
import { CommentLikeEntity } from "./domain/comment-like.entity.js";
import { CommentEntity } from "./domain/comment.entity.js";
import { CommentLikesRepository } from "./infrastructure/comment-likes.repository.js";
import { CommentsRepository } from "./infrastructure/comments.repository.js";

@Module({
  controllers: [CommentsController, PostCommentsController],
  exports: [CommentsService, CommentsRepository, CommentLikesRepository],
  imports: [PostsModule, TypeOrmModule.forFeature([CommentEntity, CommentLikeEntity])],
  providers: [CommentsService, CommentsRepository, CommentLikesRepository],
})
export class CommentsModule {}
