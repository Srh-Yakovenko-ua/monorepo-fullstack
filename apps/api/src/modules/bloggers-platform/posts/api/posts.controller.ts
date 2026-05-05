import type { LikeInput, PaginationQuery, Paginator, PostInput, PostViewModel } from "@app/shared";
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

import { UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { PostsService } from "../application/posts.service.js";

@Controller("api/posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createPost(@Body(new ZodBodyPipe(PostInputSchema)) body: PostInput): Promise<PostViewModel> {
    return this.postsService.createPost(body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePost(@Param("id") id: string): Promise<void> {
    return this.postsService.deletePost(id);
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  getPost(@Param("id") id: string, @Req() request: Request): Promise<PostViewModel> {
    return this.postsService.getPostById({
      currentUserId: request.viewerId,
      postId: id,
    });
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listPosts(
    @Query(new ZodQueryPipe(PaginationQuerySchema)) query: PaginationQuery,
    @Req() request: Request,
  ): Promise<Paginator<PostViewModel>> {
    return this.postsService.getAllPosts({ currentUserId: request.viewerId, query });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":postId/like-status")
  @UseGuards(JwtAuthGuard)
  setLikeStatus(
    @Param("postId") postId: string,
    @Body(new ZodBodyPipe(LikeInputSchema)) body: LikeInput,
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

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updatePost(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(PostInputSchema)) body: PostInput,
  ): Promise<void> {
    return this.postsService.updatePost(id, body);
  }
}
