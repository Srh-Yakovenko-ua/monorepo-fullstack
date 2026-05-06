import type { Paginator, PostViewModel } from "@app/shared";
import type { Request } from "express";

import { LikeInputSchema, PaginationQuerySchema, PostInputSchema } from "@app/shared";
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UnauthorizedError } from "../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../core/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../core/pipes/zod-query.pipe.js";
import { PostsService } from "../application/posts.service.js";
import { LikeInputDto } from "./input-dto/like-input.dto.js";
import { PaginationQueryDto } from "./input-dto/pagination-query.dto.js";
import { PostInputDto } from "./input-dto/post-input.dto.js";

@ApiTags("Posts")
@Controller("api/posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiBody({ type: PostInputDto })
  @ApiOperation({ summary: "Create a post" })
  @ApiResponse({ description: "Post created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  createPost(@Body(new ZodBodyPipe(PostInputSchema)) body: PostInputDto): Promise<PostViewModel> {
    return this.postsService.createPost(body);
  }

  @ApiOperation({ summary: "Delete a post by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Post deleted", status: 204 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param("id") id: string): Promise<void> {
    return this.postsService.deletePost(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a post by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Post found", status: 200 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  getPost(@Param("id") id: string, @Req() request: Request): Promise<PostViewModel> {
    return this.postsService.getPostById({
      currentUserId: request.viewerId,
      postId: id,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "List all posts" })
  @ApiQuery({ type: PaginationQueryDto })
  @ApiResponse({ description: "Paginated list of posts", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listPosts(
    @Query(new ZodQueryPipe(PaginationQuerySchema)) query: PaginationQueryDto,
    @Req() request: Request,
  ): Promise<Paginator<PostViewModel>> {
    return this.postsService.getAllPosts({ currentUserId: request.viewerId, query });
  }

  @ApiBearerAuth()
  @ApiBody({ type: LikeInputDto })
  @ApiOperation({ summary: "Set like/dislike status on a post" })
  @ApiParam({ name: "postId" })
  @ApiResponse({ description: "Like status updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":postId/like-status")
  @UseGuards(JwtAuthGuard)
  setLikeStatus(
    @Param("postId") postId: string,
    @Body(new ZodBodyPipe(LikeInputSchema)) body: LikeInputDto,
    @Req() request: Request,
  ): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.postsService.setLikeStatus({
      currentUserId: user.userId,
      currentUserLogin: user.login,
      newStatus: body.likeStatus,
      postId,
    });
  }

  @ApiBody({ type: PostInputDto })
  @ApiOperation({ summary: "Update a post by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Post updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updatePost(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(PostInputSchema)) body: PostInputDto,
  ): Promise<void> {
    return this.postsService.updatePost(id, body);
  }
}
