import type { CommentUpdateInput, CommentViewModel, LikeInput } from "@app/shared";
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

import { UnauthorizedError } from "../../lib/errors.js";
import { JwtAuthGuard } from "../../lib/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../../lib/guards/optional-jwt-auth.guard.js";
import { ZodBodyPipe } from "../../lib/pipes/zod-body.pipe.js";
import { CommentsService } from "./comments.service.js";

@Controller("api/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

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

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":commentId/like-status")
  @UseGuards(JwtAuthGuard)
  setLikeStatus(
    @Param("commentId") commentId: string,
    @Body(new ZodBodyPipe(LikeInputSchema)) body: LikeInput,
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

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":commentId")
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param("commentId") commentId: string,
    @Body(new ZodBodyPipe(CommentUpdateInputSchema)) body: CommentUpdateInput,
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
