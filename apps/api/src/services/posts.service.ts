import type { PostInput, PostViewModel } from "@app/shared";

import * as blogsRepository from "../db/repositories/blogs.repository.js";
import * as postsRepository from "../db/repositories/posts.repository.js";
import { NotFoundError } from "../lib/errors.js";

export async function clearAllPosts(): Promise<void> {
  await postsRepository.clearAll();
}

export async function createPost(
  input: PostInput,
): Promise<PostViewModel | { blogIdNotFound: true }> {
  const blog = await blogsRepository.findById(input.blogId);
  if (!blog) return { blogIdNotFound: true };

  return postsRepository.create({
    blogId: blog.id,
    blogName: blog.name,
    content: input.content,
    shortDescription: input.shortDescription,
    title: input.title,
  });
}

export async function deletePost(id: string): Promise<void> {
  const removed = await postsRepository.remove(id);
  if (!removed) throw new NotFoundError(`Post with id ${id} not found`);
}

export async function getAllPosts(): Promise<PostViewModel[]> {
  return postsRepository.findAll();
}

export async function getPostById(id: string): Promise<PostViewModel> {
  const post = await postsRepository.findById(id);
  if (!post) throw new NotFoundError(`Post with id ${id} not found`);
  return post;
}

export async function updatePost(
  id: string,
  input: PostInput,
): Promise<void | { blogIdNotFound: true }> {
  const existing = await postsRepository.findById(id);
  if (!existing) throw new NotFoundError(`Post with id ${id} not found`);

  const blog = await blogsRepository.findById(input.blogId);
  if (!blog) return { blogIdNotFound: true };

  await postsRepository.update(id, {
    blogId: blog.id,
    blogName: blog.name,
    content: input.content,
    shortDescription: input.shortDescription,
    title: input.title,
  });
}
