import type { BlogScopedPostInput, PaginationQuery, Paginator, PostViewModel } from "@app/shared";
import type { Request } from "express";

import { BlogScopedPostInputSchema, PaginationQuerySchema } from "@app/shared";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { OptionalJwtAuthGuard } from "../../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { BlogsService } from "../../blogs/application/blogs.service.js";
import { PostsService } from "../application/posts.service.js";

@Controller("api/blogs")
export class BlogPostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly blogsService: BlogsService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post(":id/posts")
  async createPostForBlog(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(BlogScopedPostInputSchema)) body: BlogScopedPostInput,
  ): Promise<PostViewModel> {
    await this.blogsService.getBlogById(id);
    return this.postsService.createPost({ ...body, blogId: id });
  }

  @Get(":id/posts")
  @UseGuards(OptionalJwtAuthGuard)
  async listPostsForBlog(
    @Param("id") id: string,
    @Query(new ZodQueryPipe(PaginationQuerySchema)) query: PaginationQuery,
    @Req() request: Request,
  ): Promise<Paginator<PostViewModel>> {
    await this.blogsService.getBlogById(id);
    return this.postsService.listPostsForBlog({
      blogId: id,
      currentUserId: request.viewerId,
      query,
    });
  }
}
