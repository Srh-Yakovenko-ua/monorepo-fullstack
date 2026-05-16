import { Module } from "@nestjs/common";

import { BlogsController } from "./api/blogs.controller.js";
import { BlogsService } from "./application/blogs.service.js";
import { BlogsRepository } from "./infrastructure/blogs.repository.js";

@Module({
  controllers: [BlogsController],
  exports: [BlogsService, BlogsRepository],
  providers: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
