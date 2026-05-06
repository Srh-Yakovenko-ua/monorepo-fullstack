import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PostsModule } from "../posts/posts.module.js";
import { CommentsController } from "./api/comments.controller.js";
import { PostCommentsController } from "./api/post-comments.controller.js";
import { CommentsService } from "./application/comments.service.js";
import { CommentLike, CommentLikeSchema } from "./domain/comment-like.entity.js";
import { Comment, CommentSchema } from "./domain/comment.entity.js";
import { CommentLikesRepository } from "./infrastructure/comment-likes.repository.js";
import { CommentsRepository } from "./infrastructure/comments.repository.js";

@Module({
  controllers: [CommentsController, PostCommentsController],
  exports: [CommentsService, CommentsRepository, CommentLikesRepository, MongooseModule],
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
    ]),
    PostsModule,
  ],
  providers: [CommentsService, CommentsRepository, CommentLikesRepository],
})
export class CommentsModule {}
