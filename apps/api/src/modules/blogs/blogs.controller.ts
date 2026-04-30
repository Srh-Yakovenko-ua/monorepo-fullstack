import type {
  BlogInput,
  BlogLookupItem,
  BlogScopedPostInput,
  BlogsQuery,
  BlogViewModel,
  PaginationQuery,
  Paginator,
  PostViewModel,
} from "@app/shared";
import type { Request } from "express";

import {
  BlogInputSchema,
  BlogScopedPostInputSchema,
  BlogsQuerySchema,
  PaginationQuerySchema,
} from "@app/shared";
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
  Req,
  UseGuards,
} from "@nestjs/common";

import { OptionalJwtAuthGuard } from "../../lib/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../lib/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../lib/pipes/zod-query.pipe.js";
import { BlogsService } from "./blogs.service.js";

@Controller("api/blogs")
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createBlog(@Body(new ZodBodyPipe(BlogInputSchema)) body: BlogInput): Promise<BlogViewModel> {
    return this.blogsService.createBlog(body);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(":id/posts")
  createPostForBlog(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(BlogScopedPostInputSchema)) body: BlogScopedPostInput,
  ): Promise<PostViewModel> {
    return this.blogsService.createPostForBlog(id, body);
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

  @Get(":id/posts")
  @UseGuards(OptionalJwtAuthGuard)
  listPostsForBlog(
    @Param("id") id: string,
    @Query(new ZodQueryPipe(PaginationQuerySchema)) query: PaginationQuery,
    @Req() request: Request,
  ): Promise<Paginator<PostViewModel>> {
    return this.blogsService.getPostsByBlogId({
      blogId: id,
      currentUserId: request.viewerId,
      query,
    });
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
