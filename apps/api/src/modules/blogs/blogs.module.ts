import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlogsController } from "./api/blogs.controller.js";
import { BlogsService } from "./application/blogs.service.js";
import { BlogEntity } from "./domain/blog.entity.js";
import { BlogsRepository } from "./infrastructure/blogs.repository.js";

@Module({
  controllers: [BlogsController],
  exports: [BlogsService, BlogsRepository],
  imports: [TypeOrmModule.forFeature([BlogEntity])],
  providers: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
