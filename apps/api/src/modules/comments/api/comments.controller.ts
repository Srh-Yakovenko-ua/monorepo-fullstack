import type { CommentViewModel } from "@app/shared";
import type { Request } from "express";

import { CommentUpdateInputSchema, LikeInputSchema } from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UnauthorizedError } from "../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../core/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../../core/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../core/pipes/zod-body.pipe.js";
import { LikeInputDto } from "../../posts/api/input-dto/like-input.dto.js";
import { CommentsService } from "../application/comments.service.js";
import { CommentUpdateInputDto } from "./input-dto/comment-update-input.dto.js";

@ApiTags("Comments")
@Controller("api/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a comment by id" })
  @ApiParam({ name: "commentId" })
  @ApiResponse({ description: "Comment deleted", status: 204 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Forbidden — not the owner", status: 403 })
  @ApiResponse({ description: "Comment not found", status: 404 })
  @Delete(":commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param("commentId") commentId: string, @Req() request: Request): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.commentsService.deleteComment({
      commentId,
      currentUserId: user.userId,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a comment by id" })
  @ApiParam({ name: "commentId" })
  @ApiResponse({ description: "Comment found", status: 200 })
  @ApiResponse({ description: "Comment not found", status: 404 })
  @Get(":commentId")
  @UseGuards(OptionalJwtAuthGuard)
  getCommentById(
    @Param("commentId") commentId: string,
    @Req() request: Request,
  ): Promise<CommentViewModel> {
    return this.commentsService.getCommentById({
      commentId,
      currentUserId: request.viewerId,
    });
  }

  @ApiBearerAuth()
  @ApiBody({ type: LikeInputDto })
  @ApiOperation({ summary: "Set like/dislike status on a comment" })
  @ApiParam({ name: "commentId" })
  @ApiResponse({ description: "Like status updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Comment not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":commentId/like-status")
  @UseGuards(JwtAuthGuard)
  setLikeStatus(
    @Param("commentId") commentId: string,
    @Body(new ZodBodyPipe(LikeInputSchema)) body: LikeInputDto,
    @Req() request: Request,
  ): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.commentsService.setLikeStatus({
      commentId,
      currentUserId: user.userId,
      newStatus: body.likeStatus,
    });
  }

  @ApiBearerAuth()
  @ApiBody({ type: CommentUpdateInputDto })
  @ApiOperation({ summary: "Update a comment by id" })
  @ApiParam({ name: "commentId" })
  @ApiResponse({ description: "Comment updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Forbidden — not the owner", status: 403 })
  @ApiResponse({ description: "Comment not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":commentId")
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param("commentId") commentId: string,
    @Body(new ZodBodyPipe(CommentUpdateInputSchema)) body: CommentUpdateInputDto,
    @Req() request: Request,
  ): Promise<void> {
    const user = request.user;
    if (!user) throw new UnauthorizedError();
    return this.commentsService.updateComment({
      commentId,
      currentUserId: user.userId,
      input: body,
    });
  }
}
