import type { CommentViewModel, Paginator } from "@app/shared";
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { CommentsService } from "../application/comments.service.js";
import { CommentUpdateInputDto } from "./input-dto/comment-update-input.dto.js";
import { CommentsQueryDto } from "./input-dto/comments-query.dto.js";

@ApiTags("Comments")
@Controller("api/posts")
export class PostCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiBearerAuth()
  @ApiBody({ type: CommentUpdateInputDto })
  @ApiOperation({ summary: "Create a comment for a post" })
  @ApiParam({ name: "postId" })
  @ApiResponse({ description: "Comment created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @HttpCode(HttpStatus.CREATED)
  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  createPostComment(
    @Param("postId") postId: string,
    @Body(new ZodBodyPipe(CommentUpdateInputSchema)) body: CommentUpdateInputDto,
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

  @ApiBearerAuth()
  @ApiOperation({ summary: "List comments for a post" })
  @ApiParam({ name: "postId" })
  @ApiQuery({ type: CommentsQueryDto })
  @ApiResponse({ description: "Paginated list of comments", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @ApiResponse({ description: "Post not found", status: 404 })
  @Get(":postId/comments")
  @UseGuards(OptionalJwtAuthGuard)
  listPostComments(
    @Param("postId") postId: string,
    @Query(new ZodQueryPipe(CommentsQuerySchema)) query: CommentsQueryDto,
    @Req() request: Request,
  ): Promise<Paginator<CommentViewModel>> {
    return this.commentsService.listPostComments({
      currentUserId: request.viewerId,
      postId,
      query,
    });
  }
}
