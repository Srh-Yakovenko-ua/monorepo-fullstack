import { Module } from "@nestjs/common";

import { BlogsModule } from "../blogs/blogs.module.js";
import { CommentsModule } from "../comments/comments.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { SecurityModule } from "../security/security.module.js";
import { UsersModule } from "../users/users.module.js";
import { VideosModule } from "../videos/videos.module.js";
import { TestingController } from "./testing.controller.js";
import { registerTestingOpenApi } from "./testing.openapi.js";

registerTestingOpenApi();

@Module({
  controllers: [TestingController],
  imports: [BlogsModule, CommentsModule, PostsModule, SecurityModule, UsersModule, VideosModule],
})
export class TestingModule {}
