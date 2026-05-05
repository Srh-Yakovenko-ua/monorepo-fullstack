import type { Paginator, PostViewModel } from "@app/shared";
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { OptionalJwtAuthGuard } from "../../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { BlogsService } from "../../blogs/application/blogs.service.js";
import { PostsService } from "../application/posts.service.js";
import { BlogScopedPostInputDto } from "./input-dto/blog-scoped-post-input.dto.js";
import { PaginationQueryDto } from "./input-dto/pagination-query.dto.js";

@ApiTags("Posts")
@Controller("api/blogs")
export class BlogPostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly blogsService: BlogsService,
  ) {}

  @ApiBody({ type: BlogScopedPostInputDto })
  @ApiOperation({ summary: "Create a post for a specific blog" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Post created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Blog not found", status: 404 })
  @HttpCode(HttpStatus.CREATED)
  @Post(":id/posts")
  async createPostForBlog(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(BlogScopedPostInputSchema)) body: BlogScopedPostInputDto,
  ): Promise<PostViewModel> {
    await this.blogsService.getBlogById(id);
    return this.postsService.createPost({ ...body, blogId: id });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "List posts of a specific blog" })
  @ApiParam({ name: "id" })
  @ApiQuery({ type: PaginationQueryDto })
  @ApiResponse({ description: "Paginated list of posts", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @ApiResponse({ description: "Blog not found", status: 404 })
  @Get(":id/posts")
  @UseGuards(OptionalJwtAuthGuard)
  async listPostsForBlog(
    @Param("id") id: string,
    @Query(new ZodQueryPipe(PaginationQuerySchema)) query: PaginationQueryDto,
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
