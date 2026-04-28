import type { BlogInput, BlogScopedPostInput, BlogViewModel, PostViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { BlogsQuerySchema, PaginationQuerySchema } from "@app/shared";

import { HTTP_STATUS } from "../lib/http-status.js";
import { validatedQuery } from "../middleware/validate.js";
import * as blogsService from "../services/blogs.service.js";

type BlogBodyReq = Request<unknown, unknown, BlogInput>;
type BlogScopedPostReq = Request<IdParams, unknown, BlogScopedPostInput>;
type BlogUpdateReq = Request<IdParams, unknown, BlogInput>;
type IdParams = { id: string };

export async function createBlog(req: BlogBodyReq, res: Response<BlogViewModel>): Promise<void> {
  const blog = await blogsService.createBlog(req.body);
  res.status(HTTP_STATUS.CREATED).json(blog);
}

export async function createPostForBlog(
  req: BlogScopedPostReq,
  res: Response<PostViewModel>,
): Promise<void> {
  const post = await blogsService.createPostForBlog(req.params.id, req.body);
  res.status(HTTP_STATUS.CREATED).json(post);
}

export async function deleteBlog(req: Request<IdParams>, res: Response<void>): Promise<void> {
  await blogsService.deleteBlog(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function getBlog(req: Request<IdParams>, res: Response<BlogViewModel>): Promise<void> {
  const blog = await blogsService.getBlogById(req.params.id);
  res.status(HTTP_STATUS.OK).json(blog);
}

export async function listBlogLookup(req: Request, res: Response): Promise<void> {
  const query = validatedQuery(req, BlogsQuerySchema);
  const page = await blogsService.getBlogLookup(query);
  res.status(HTTP_STATUS.OK).json(page);
}

export async function listBlogs(req: Request, res: Response): Promise<void> {
  const query = validatedQuery(req, BlogsQuerySchema);
  const page = await blogsService.getAllBlogs(query);
  res.status(HTTP_STATUS.OK).json(page);
}

export async function listPostsForBlog(req: Request<IdParams>, res: Response): Promise<void> {
  const query = validatedQuery(req, PaginationQuerySchema);
  const page = await blogsService.getPostsByBlogId({
    blogId: req.params.id,
    currentUserId: req.viewerId,
    query,
  });
  res.status(HTTP_STATUS.OK).json(page);
}

export async function updateBlog(req: BlogUpdateReq, res: Response<void>): Promise<void> {
  await blogsService.updateBlog(req.params.id, req.body);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
