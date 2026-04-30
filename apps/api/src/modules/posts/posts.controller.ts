import type {
  CommentsQuery,
  CommentUpdateInput,
  CommentViewModel,
  LikeInput,
  PaginationQuery,
  Paginator,
  PostInput,
  PostViewModel,
} from "@app/shared";
import type { Request } from "express";

import {
  CommentsQuerySchema,
  CommentUpdateInputSchema,
  LikeInputSchema,
  PaginationQuerySchema,
  PostInputSchema,
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

import { UnauthorizedError } from "../../lib/errors.js";
import { JwtAuthGuard } from "../../lib/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../lib/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../lib/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../lib/pipes/zod-query.pipe.js";
import { CommentsService } from "../comments/comments.service.js";
import { PostsService } from "./posts.service.js";

@Controller("api/posts")
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  createPost(@Body(new ZodBodyPipe(PostInputSchema)) body: PostInput): Promise<PostViewModel> {
    return this.postsService.createPost(body);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  createPostComment(
    @Param("postId") postId: string,
    @Body(new ZodBodyPipe(CommentUpdateInputSchema)) body: CommentUpdateInput,
    @Req() request: Request,
  ): Promise<CommentViewModel> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.commentsService.createPostComment({
      currentUser: { login: user.login, userId: user.userId },
      input: body,
      postId,
    });
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

  @Get(":postId/comments")
  @UseGuards(OptionalJwtAuthGuard)
  listPostComments(
    @Param("postId") postId: string,
    @Query(new ZodQueryPipe(CommentsQuerySchema)) query: CommentsQuery,
    @Req() request: Request,
  ): Promise<Paginator<CommentViewModel>> {
    return this.commentsService.listPostComments({
      currentUserId: request.viewerId,
      postId,
      query,
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
