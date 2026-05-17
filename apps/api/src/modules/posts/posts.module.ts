import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlogsModule } from "../blogs/blogs.module.js";
import { BlogPostsController } from "./api/blog-posts.controller.js";
import { PostsController } from "./api/posts.controller.js";
import { PostsService } from "./application/posts.service.js";
import { PostLikeEntity } from "./domain/post-like.entity.js";
import { PostEntity } from "./domain/post.entity.js";
import { PostLikesRepository } from "./infrastructure/post-likes.repository.js";
import { PostsRepository } from "./infrastructure/posts.repository.js";

@Module({
  controllers: [PostsController, BlogPostsController],
  exports: [PostsService, PostsRepository, PostLikesRepository],
  imports: [BlogsModule, TypeOrmModule.forFeature([PostEntity, PostLikeEntity])],
  providers: [PostsService, PostsRepository, PostLikesRepository],
})
export class PostsModule {}
