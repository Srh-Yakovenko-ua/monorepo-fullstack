import type { BlogInput, BlogViewModel } from "@app/shared";

import * as blogsRepository from "../db/repositories/blogs.repository.js";
import { NotFoundError } from "../lib/errors.js";

export async function clearAllBlogs(): Promise<void> {
  await blogsRepository.clearAll();
}

export async function createBlog(input: BlogInput): Promise<BlogViewModel> {
  return blogsRepository.create({
    description: input.description,
    name: input.name,
    websiteUrl: input.websiteUrl,
  });
}

export async function deleteBlog(id: string): Promise<void> {
  const removed = await blogsRepository.remove(id);
  if (!removed) throw new NotFoundError(`Blog with id ${id} not found`);
}

export async function getAllBlogs(): Promise<BlogViewModel[]> {
  return blogsRepository.findAll();
}

export async function getBlogById(id: string): Promise<BlogViewModel> {
  const blog = await blogsRepository.findById(id);
  if (!blog) throw new NotFoundError(`Blog with id ${id} not found`);
  return blog;
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
