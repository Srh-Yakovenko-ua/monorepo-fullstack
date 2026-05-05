import type { CommentsQuery, CommentUpdateInput, CommentViewModel, Paginator } from "@app/shared";
import type { Request } from "express";

import { CommentsQuerySchema, CommentUpdateInputSchema } from "@app/shared";
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

import { UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { CommentsService } from "../application/comments.service.js";

@Controller("api/posts")
export class PostCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

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
}
