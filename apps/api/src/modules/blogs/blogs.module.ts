import { Module } from "@nestjs/common";

import { PostsModule } from "../posts/posts.module.js";
import { BlogsController } from "./blogs.controller.js";
import { registerBlogsOpenApi } from "./blogs.openapi.js";
import { BlogsService } from "./blogs.service.js";

registerBlogsOpenApi();

@Module({
  controllers: [BlogsController],
  exports: [BlogsService],
  imports: [PostsModule],
  providers: [BlogsService],
})
export class BlogsModule {}
