import type {
  BlogInput,
  BlogLookupItem,
  BlogScopedPostInput,
  BlogsQuery,
  BlogViewModel,
  PaginationQuery,
  Paginator,
  PostViewModel,
} from "@app/shared";

import type { BlogDoc } from "../db/models/blog.model.js";
import type { BlogLookupDoc } from "../db/repositories/blogs.repository.js";

import * as blogsRepository from "../db/repositories/blogs.repository.js";
import * as postsRepository from "../db/repositories/posts.repository.js";
import { NotFoundError } from "../lib/errors.js";
import { buildPaginator } from "../lib/paginator.js";
import { toPostView } from "../services/posts.service.js";

export async function clearAllBlogs(): Promise<void> {
  await blogsRepository.clearAll();
}

export async function createBlog(input: BlogInput): Promise<BlogViewModel> {
  const doc = await blogsRepository.create({
    description: input.description,
    name: input.name,
    websiteUrl: input.websiteUrl,
  });
  return toBlogView(doc);
}

export async function createPostForBlog(
  blogId: string,
  input: BlogScopedPostInput,
): Promise<PostViewModel> {
  const blog = await blogsRepository.findById(blogId);
  if (!blog) throw new NotFoundError(`Blog with id ${blogId} not found`);

  const doc = await postsRepository.create({
    blogId: blog._id.toHexString(),
    blogName: blog.name,
    content: input.content,
    shortDescription: input.shortDescription,
    title: input.title,
  });
  return toPostView(doc);
}

export async function deleteBlog(id: string): Promise<void> {
  const removed = await blogsRepository.remove(id);
  if (!removed) throw new NotFoundError(`Blog with id ${id} not found`);
}

export async function getAllBlogs(query: BlogsQuery): Promise<Paginator<BlogViewModel>> {
  const { items, totalCount } = await blogsRepository.findPage(query);
  return buildPaginator({
    items: items.map(toBlogView),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export async function getBlogById(id: string): Promise<BlogViewModel> {
  const blog = await blogsRepository.findById(id);
  if (!blog) throw new NotFoundError(`Blog with id ${id} not found`);
  return toBlogView(blog);
}

export async function getBlogLookup(query: BlogsQuery): Promise<Paginator<BlogLookupItem>> {
  const { items, totalCount } = await blogsRepository.findLookupPage(query);
  return buildPaginator({
    items: items.map(toBlogLookupItem),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export async function getPostsByBlogId(
  blogId: string,
  query: PaginationQuery,
): Promise<Paginator<PostViewModel>> {
  const blog = await blogsRepository.findById(blogId);
  if (!blog) throw new NotFoundError(`Blog with id ${blogId} not found`);

  const { items, totalCount } = await postsRepository.findPage({ ...query, blogId });
  return buildPaginator({
    items: items.map(toPostView),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export function toBlogLookupItem(doc: BlogLookupDoc): BlogLookupItem {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
  };
}

export function toBlogView(doc: BlogDoc): BlogViewModel {
  return {
    createdAt: doc.createdAt.toISOString(),
    description: doc.description,
    id: doc._id.toHexString(),
    isMembership: doc.isMembership,
    name: doc.name,
    websiteUrl: doc.websiteUrl,
  };
}

export async function updateBlog(id: string, input: BlogInput): Promise<void> {
  const existing = await blogsRepository.findById(id);
  if (!existing) throw new NotFoundError(`Blog with id ${id} not found`);
  await blogsRepository.update(id, {
    description: input.description,
    name: input.name,
    websiteUrl: input.websiteUrl,
  });
}
