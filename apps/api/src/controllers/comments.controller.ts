import type { CommentUpdateInput, CommentViewModel, LikeInput, Paginator } from "@app/shared";
import type { Request, Response } from "express";

import { CommentsQuerySchema } from "@app/shared";

import { UnauthorizedError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { validatedQuery } from "../middleware/validate.js";
import * as commentsService from "../services/comments.service.js";

export async function createPostComment(
  req: Request<{ postId: string }, unknown, CommentUpdateInput>,
  res: Response<CommentViewModel>,
): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();
  const result = await commentsService.createPostComment({
    currentUser: { login: user.login, userId: user.userId },
    input: req.body,
    postId: req.params.postId,
  });
  res.status(HTTP_STATUS.CREATED).json(result);
}

export async function deleteComment(
  req: Request<{ commentId: string }>,
  res: Response<void>,
): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  await commentsService.deleteComment({
    commentId: req.params.commentId,
    currentUserId: user.userId,
  });

  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getCommentById(
  req: Request<{ commentId: string }>,
  res: Response<CommentViewModel>,
): Promise<void> {
  const result = await commentsService.getCommentById({
    commentId: req.params.commentId,
    currentUserId: req.viewerId,
  });
  res.status(HTTP_STATUS.OK).json(result);
}

export async function listPostComments(
  req: Request<{ postId: string }>,
  res: Response<Paginator<CommentViewModel>>,
): Promise<void> {
  const query = validatedQuery(req, CommentsQuerySchema);
  const result = await commentsService.listPostComments({
    currentUserId: req.viewerId,
    postId: req.params.postId,
    query,
  });
  res.status(HTTP_STATUS.OK).json(result);
}

export async function setLikeStatus(
  req: Request<{ commentId: string }, unknown, LikeInput>,
  res: Response<void>,
): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  await commentsService.setLikeStatus({
    commentId: req.params.commentId,
    currentUserId: user.userId,
    newStatus: req.body.likeStatus,
  });

  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function updateComment(
  req: Request<{ commentId: string }, unknown, CommentUpdateInput>,
  res: Response<void>,
): Promise<void> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();

  await commentsService.updateComment({
    commentId: req.params.commentId,
    currentUserId: user.userId,
    input: req.body,
  });

  res.status(HTTP_STATUS.NO_CONTENT).send();
}
