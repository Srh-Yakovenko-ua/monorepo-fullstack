import type { BlogInput, BlogLookupItem, BlogsQuery, BlogViewModel, Paginator } from "@app/shared";

import { Injectable } from "@nestjs/common";

import type { BlogDoc } from "../domain/blog.entity.js";
import type { BlogLookupDoc } from "../infrastructure/blogs.repository.js";

import { NotFoundError } from "../../../core/exceptions/errors.js";
import { buildPaginator } from "../../../core/paginator.js";
import { BlogsRepository } from "../infrastructure/blogs.repository.js";

@Injectable()
export class BlogsService {
  constructor(private readonly blogsRepository: BlogsRepository) {}

  async clearAllBlogs(): Promise<void> {
    await this.blogsRepository.clearAll();
  }

  async createBlog(input: BlogInput): Promise<BlogViewModel> {
    const doc = await this.blogsRepository.create({
      description: input.description,
      name: input.name,
      websiteUrl: input.websiteUrl,
    });
    return toBlogView(doc);
  }

  async deleteBlog(id: string): Promise<void> {
    const removed = await this.blogsRepository.remove(id);
    if (!removed) throw new NotFoundError(`Blog with id ${id} not found`);
  }

  async getAllBlogs(query: BlogsQuery): Promise<Paginator<BlogViewModel>> {
    const { items, totalCount } = await this.blogsRepository.findPage(query);
    return buildPaginator({
      items: items.map(toBlogView),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async getBlogById(id: string): Promise<BlogViewModel> {
    const blog = await this.blogsRepository.findById(id);
    if (!blog) throw new NotFoundError(`Blog with id ${id} not found`);
    return toBlogView(blog);
  }

  async getBlogLookup(query: BlogsQuery): Promise<Paginator<BlogLookupItem>> {
    const { items, totalCount } = await this.blogsRepository.findLookupPage(query);
    return buildPaginator({
      items: items.map(toBlogLookupItem),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async updateBlog(id: string, input: BlogInput): Promise<void> {
    const existing = await this.blogsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Blog with id ${id} not found`);
    await this.blogsRepository.update(id, {
      description: input.description,
      name: input.name,
      websiteUrl: input.websiteUrl,
    });
  }
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
