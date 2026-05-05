import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BlogsController } from "./api/blogs.controller.js";
import { BlogsService } from "./application/blogs.service.js";
import { Blog, BlogSchema } from "./domain/blog.entity.js";
import { BlogsRepository } from "./infrastructure/blogs.repository.js";

@Module({
  controllers: [BlogsController],
  exports: [BlogsService, BlogsRepository, MongooseModule],
  imports: [MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }])],
  providers: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
