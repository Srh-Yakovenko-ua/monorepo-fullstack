import { Module } from "@nestjs/common";

import { BlogsModule } from "../blogs/blogs.module.js";
import { BlogPostsController } from "./api/blog-posts.controller.js";
import { PostsController } from "./api/posts.controller.js";
import { PostsService } from "./application/posts.service.js";
import { PostLikesRepository } from "./infrastructure/post-likes.repository.js";
import { PostsRepository } from "./infrastructure/posts.repository.js";

@Module({
  controllers: [PostsController, BlogPostsController],
  exports: [PostsService, PostsRepository, PostLikesRepository],
  imports: [BlogsModule],
  providers: [PostsService, PostsRepository, PostLikesRepository],
})
export class PostsModule {}
