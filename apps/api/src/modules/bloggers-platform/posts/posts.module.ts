import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BlogsModule } from "../blogs/blogs.module.js";
import { BlogPostsController } from "./api/blog-posts.controller.js";
import { PostsController } from "./api/posts.controller.js";
import { PostsService } from "./application/posts.service.js";
import { PostLike, PostLikeSchema } from "./domain/post-like.entity.js";
import { Post, PostSchema } from "./domain/post.entity.js";
import { PostLikesRepository } from "./infrastructure/post-likes.repository.js";
import { PostsRepository } from "./infrastructure/posts.repository.js";

@Module({
  controllers: [PostsController, BlogPostsController],
  exports: [PostsService, PostsRepository, PostLikesRepository, MongooseModule],
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostLike.name, schema: PostLikeSchema },
    ]),
    BlogsModule,
  ],
  providers: [PostsService, PostsRepository, PostLikesRepository],
})
export class PostsModule {}
