import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BlogsController } from "./api/blogs.controller.js";
import { registerBlogsOpenApi } from "./api/blogs.openapi.js";
import { BlogsService } from "./application/blogs.service.js";
import { Blog, BlogSchema } from "./domain/blog.entity.js";
import { BlogsRepository } from "./infrastructure/blogs.repository.js";

registerBlogsOpenApi();

@Module({
  controllers: [BlogsController],
  exports: [BlogsService, BlogsRepository, MongooseModule],
  imports: [MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }])],
  providers: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
