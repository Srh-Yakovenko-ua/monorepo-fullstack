import type { PostInput, PostViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { PaginationQuerySchema } from "@app/shared";

import { HTTP_STATUS } from "../lib/http-status.js";
import { validatedQuery } from "../middleware/validate.js";
import * as postsService from "../services/posts.service.js";

type IdParams = { id: string };
type PostBodyReq = Request<unknown, unknown, PostInput>;
type PostUpdateReq = Request<IdParams, unknown, PostInput>;

export async function createPost(req: PostBodyReq, res: Response<PostViewModel>): Promise<void> {
  const post = await postsService.createPost(req.body);
  res.status(HTTP_STATUS.CREATED).json(post);
}

export async function deletePost(req: Request<IdParams>, res: Response<void>): Promise<void> {
  await postsService.deletePost(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getPost(req: Request<IdParams>, res: Response<PostViewModel>): Promise<void> {
  const post = await postsService.getPostById(req.params.id);
  res.status(HTTP_STATUS.OK).json(post);
}

export async function listPosts(req: Request, res: Response): Promise<void> {
  const query = validatedQuery(req, PaginationQuerySchema);
  const page = await postsService.getAllPosts(query);
  res.status(HTTP_STATUS.OK).json(page);
}

export async function updatePost(req: PostUpdateReq, res: Response<void>): Promise<void> {
  await postsService.updatePost(req.params.id, req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
