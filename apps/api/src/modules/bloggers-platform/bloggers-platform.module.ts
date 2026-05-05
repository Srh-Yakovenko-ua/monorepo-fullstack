import { Module } from "@nestjs/common";

import { BlogsModule } from "./blogs/blogs.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { PostsModule } from "./posts/posts.module.js";

@Module({
  exports: [BlogsModule, CommentsModule, PostsModule],
  imports: [BlogsModule, CommentsModule, PostsModule],
})
export class BloggersPlatformModule {}
