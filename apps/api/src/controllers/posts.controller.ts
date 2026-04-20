import type { ApiErrorResult, PostViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { PostInputSchema } from "@app/shared";

import { HTTP_STATUS } from "../lib/http-status.js";
import { fieldError, mapZodError } from "../lib/zod-error.js";
import * as postsService from "../services/posts.service.js";

type IdParams = { id: string };
type PostListRes = Response<PostViewModel[]>;
type PostRes = Response<ApiErrorResult | PostViewModel>;
type PostWriteReq = Request<unknown, ApiErrorResult | PostViewModel, unknown>;
type UpdateReq = Request<IdParams, ApiErrorResult | void, unknown>;

export async function createPost(req: PostWriteReq, res: PostRes): Promise<void> {
  const parsed = PostInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }

  const result = await postsService.createPost(parsed.data);
  if ("blogIdNotFound" in result) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(fieldError("blogId", "blog not found"));
    return;
  }

  res.status(HTTP_STATUS.CREATED).json(result);
}

export async function deletePost(req: Request<IdParams>, res: Response<void>): Promise<void> {
  await postsService.deletePost(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getPost(req: Request<IdParams>, res: Response<PostViewModel>): Promise<void> {
  const post = await postsService.getPostById(req.params.id);
  res.status(HTTP_STATUS.OK).json(post);
}

export async function listPosts(_req: Request, res: PostListRes): Promise<void> {
  res.status(HTTP_STATUS.OK).json(await postsService.getAllPosts());
}

export async function updatePost(
  req: UpdateReq,
  res: Response<ApiErrorResult | void>,
): Promise<void> {
  const parsed = PostInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }

  const result = await postsService.updatePost(req.params.id, parsed.data);
  if (result && "blogIdNotFound" in result) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(fieldError("blogId", "blog not found"));
    return;
  }

  res.status(HTTP_STATUS.NO_CONTENT).send();
}
