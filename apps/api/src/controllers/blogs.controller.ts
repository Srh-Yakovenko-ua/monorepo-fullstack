import type { ApiErrorResult, BlogViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { BlogInputSchema } from "@app/shared";

import { HTTP_STATUS } from "../lib/http-status.js";
import { mapZodError } from "../lib/zod-error.js";
import * as blogsService from "../services/blogs.service.js";

type BlogListRes = Response<BlogViewModel[]>;
type BlogRes = Response<ApiErrorResult | BlogViewModel>;
type BlogWriteReq = Request<unknown, ApiErrorResult | BlogViewModel, unknown>;
type IdParams = { id: string };
type UpdateReq = Request<IdParams, ApiErrorResult | void, unknown>;

export async function createBlog(req: BlogWriteReq, res: BlogRes): Promise<void> {
  const parsed = BlogInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }
  const blog = await blogsService.createBlog(parsed.data);
  res.status(HTTP_STATUS.CREATED).json(blog);
}

export async function deleteBlog(req: Request<IdParams>, res: Response<void>): Promise<void> {
  await blogsService.deleteBlog(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getBlog(req: Request<IdParams>, res: Response<BlogViewModel>): Promise<void> {
  const blog = await blogsService.getBlogById(req.params.id);
  res.status(HTTP_STATUS.OK).json(blog);
}

export async function listBlogs(_req: Request, res: BlogListRes): Promise<void> {
  res.status(HTTP_STATUS.OK).json(await blogsService.getAllBlogs());
}

export async function updateBlog(
  req: UpdateReq,
  res: Response<ApiErrorResult | void>,
): Promise<void> {
  const parsed = BlogInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(mapZodError(parsed.error));
    return;
  }
  await blogsService.updateBlog(req.params.id, parsed.data);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
