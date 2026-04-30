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

import { Injectable } from "@nestjs/common";

import type { BlogDoc } from "../../db/models/blog.model.js";
import type { BlogLookupDoc } from "../../db/repositories/blogs.repository.js";

import * as blogsRepository from "../../db/repositories/blogs.repository.js";
import * as postsRepository from "../../db/repositories/posts.repository.js";
import { NotFoundError } from "../../lib/errors.js";
import { buildPaginator } from "../../lib/paginator.js";
import { PostsService, toPostView } from "../posts/posts.service.js";

@Injectable()
export class BlogsService {
  constructor(private readonly postsService: PostsService) {}

  async clearAllBlogs(): Promise<void> {
    await blogsRepository.clearAll();
  }

  async createBlog(input: BlogInput): Promise<BlogViewModel> {
    const doc = await blogsRepository.create({
      description: input.description,
      name: input.name,
      websiteUrl: input.websiteUrl,
    });
    return toBlogView(doc);
  }

  async createPostForBlog(blogId: string, input: BlogScopedPostInput): Promise<PostViewModel> {
    const blog = await blogsRepository.findById(blogId);
    if (!blog) throw new NotFoundError(`Blog with id ${blogId} not found`);

    const doc = await postsRepository.create({
      blogId: blog._id.toHexString(),
      blogName: blog.name,
      content: input.content,
      shortDescription: input.shortDescription,
      title: input.title,
    });
    return toPostView({ doc, myStatus: "None", newestLikes: [] });
  }

  async deleteBlog(id: string): Promise<void> {
    const removed = await blogsRepository.remove(id);
    if (!removed) throw new NotFoundError(`Blog with id ${id} not found`);
  }

  async getAllBlogs(query: BlogsQuery): Promise<Paginator<BlogViewModel>> {
    const { items, totalCount } = await blogsRepository.findPage(query);
    return buildPaginator({
      items: items.map(toBlogView),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async getBlogById(id: string): Promise<BlogViewModel> {
    const blog = await blogsRepository.findById(id);
    if (!blog) throw new NotFoundError(`Blog with id ${id} not found`);
    return toBlogView(blog);
  }

  async getBlogLookup(query: BlogsQuery): Promise<Paginator<BlogLookupItem>> {
    const { items, totalCount } = await blogsRepository.findLookupPage(query);
    return buildPaginator({
      items: items.map(toBlogLookupItem),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async getPostsByBlogId({
    blogId,
    currentUserId,
    query,
  }: {
    blogId: string;
    currentUserId?: string;
    query: PaginationQuery;
  }): Promise<Paginator<PostViewModel>> {
    const blog = await blogsRepository.findById(blogId);
    if (!blog) throw new NotFoundError(`Blog with id ${blogId} not found`);
    return this.postsService.listPostsForBlog({ blogId, currentUserId, query });
  }

  async updateBlog(id: string, input: BlogInput): Promise<void> {
    const existing = await blogsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Blog with id ${id} not found`);
    await blogsRepository.update(id, {
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
