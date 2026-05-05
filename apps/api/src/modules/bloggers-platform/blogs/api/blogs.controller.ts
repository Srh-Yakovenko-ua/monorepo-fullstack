import type { BlogInput, BlogLookupItem, BlogsQuery, BlogViewModel, Paginator } from "@app/shared";

import { BlogInputSchema, BlogsQuerySchema } from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { BlogsService } from "../application/blogs.service.js";

@Controller("api/blogs")
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createBlog(@Body(new ZodBodyPipe(BlogInputSchema)) body: BlogInput): Promise<BlogViewModel> {
    return this.blogsService.createBlog(body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBlog(@Param("id") id: string): Promise<void> {
    return this.blogsService.deleteBlog(id);
  }

  @Get("lookup")
  listBlogLookup(
    @Query(new ZodQueryPipe(BlogsQuerySchema)) query: BlogsQuery,
  ): Promise<Paginator<BlogLookupItem>> {
    return this.blogsService.getBlogLookup(query);
  }

  @Get()
  listBlogs(
    @Query(new ZodQueryPipe(BlogsQuerySchema)) query: BlogsQuery,
  ): Promise<Paginator<BlogViewModel>> {
    return this.blogsService.getAllBlogs(query);
  }

  @Get(":id")
  getBlog(@Param("id") id: string): Promise<BlogViewModel> {
    return this.blogsService.getBlogById(id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updateBlog(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(BlogInputSchema)) body: BlogInput,
  ): Promise<void> {
    return this.blogsService.updateBlog(id, body);
  }
}
