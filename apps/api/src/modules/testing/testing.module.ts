import { Module } from "@nestjs/common";

import { BlogsModule } from "../bloggers-platform/blogs/blogs.module.js";
import { CommentsModule } from "../bloggers-platform/comments/comments.module.js";
import { PostsModule } from "../bloggers-platform/posts/posts.module.js";
import { SecurityModule } from "../user-accounts/security/security.module.js";
import { UsersModule } from "../user-accounts/users/users.module.js";
import { VideosModule } from "../videos/videos.module.js";
import { TestingController } from "./testing.controller.js";
import { registerTestingOpenApi } from "./testing.openapi.js";

registerTestingOpenApi();

@Module({
  controllers: [TestingController],
  imports: [BlogsModule, CommentsModule, PostsModule, SecurityModule, UsersModule, VideosModule],
})
export class TestingModule {}
