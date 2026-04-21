import type { PaginationQuery, Paginator, PostInput, PostViewModel } from "@app/shared";

import type { PostDoc } from "../db/models/post.model.js";

import * as blogsRepository from "../db/repositories/blogs.repository.js";
import * as postsRepository from "../db/repositories/posts.repository.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { buildPaginator } from "../lib/paginator.js";

export async function clearAllPosts(): Promise<void> {
  await postsRepository.clearAll();
}

export async function createPost(input: PostInput): Promise<PostViewModel> {
  const blog = await blogsRepository.findById(input.blogId);
  if (!blog) {
    throw new BadRequestError("Referenced blog does not exist", {
      fields: [{ field: "blogId", message: "blog not found" }],
    });
  }

  const doc = await postsRepository.create({
    blogId: blog._id.toHexString(),
    blogName: blog.name,
    content: input.content,
    shortDescription: input.shortDescription,
    title: input.title,
  });
  return toPostView(doc);
}

export async function deletePost(id: string): Promise<void> {
  const removed = await postsRepository.remove(id);
  if (!removed) throw new NotFoundError(`Post with id ${id} not found`);
}

export async function getAllPosts(query: PaginationQuery): Promise<Paginator<PostViewModel>> {
  const { items, totalCount } = await postsRepository.findPage(query);
  return buildPaginator({
    items: items.map(toPostView),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    totalCount,
  });
}

export async function getPostById(id: string): Promise<PostViewModel> {
  const post = await postsRepository.findById(id);
  if (!post) throw new NotFoundError(`Post with id ${id} not found`);
  return toPostView(post);
}

export function toPostView(doc: PostDoc): PostViewModel {
  return {
    blogId: doc.blogId,
    blogName: doc.blogName,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    id: doc._id.toHexString(),
    shortDescription: doc.shortDescription,
    title: doc.title,
  };
}

export async function updatePost(id: string, input: PostInput): Promise<void> {
  const existing = await postsRepository.findById(id);
  if (!existing) throw new NotFoundError(`Post with id ${id} not found`);

  const blog = await blogsRepository.findById(input.blogId);
  if (!blog) {
    throw new BadRequestError("Referenced blog does not exist", {
      fields: [{ field: "blogId", message: "blog not found" }],
    });
  }

  await postsRepository.update(id, {
    blogId: blog._id.toHexString(),
    blogName: blog.name,
    content: input.content,
    shortDescription: input.shortDescription,
    title: input.title,
  });
}
