import { BlogInputSchema, BlogScopedPostInputSchema } from "@app/shared";
import { z } from "zod";

import { apiErrorResultSchema, registerPaths, stringIdParam } from "../../lib/openapi.js";

const blogViewModelSchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string(),
  id: z.string(),
  isMembership: z.boolean(),
  name: z.string(),
  websiteUrl: z.string(),
});

const postViewModelSchema = z.object({
  blogId: z.string(),
  blogName: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  id: z.string(),
  shortDescription: z.string(),
  title: z.string(),
});

function paginatorSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pagesCount: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
  });
}

const paginationQueryParams = [
  {
    in: "query" as const,
    name: "pageNumber",
    schema: { default: 1, minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "pageSize",
    schema: { default: 10, minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "sortBy",
    schema: { default: "createdAt", enum: ["createdAt", "name"], type: "string" as const },
  },
  {
    in: "query" as const,
    name: "sortDirection",
    schema: { default: "desc", enum: ["asc", "desc"], type: "string" as const },
  },
  { in: "query" as const, name: "searchNameTerm", schema: { type: "string" as const } },
];

const postsPaginationQueryParams = [
  {
    in: "query" as const,
    name: "pageNumber",
    schema: { default: 1, minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "pageSize",
    schema: { default: 10, minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "sortBy",
    schema: {
      default: "createdAt",
      enum: ["createdAt", "title", "blogName"],
      type: "string" as const,
    },
  },
  {
    in: "query" as const,
    name: "sortDirection",
    schema: { default: "desc", enum: ["asc", "desc"], type: "string" as const },
  },
];

const blogLookupItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export function registerBlogsOpenApi(): void {
  registerPaths({
    "/api/blogs": {
      get: {
        operationId: "listBlogs",
        parameters: paginationQueryParams,
        responses: {
          "200": {
            content: { "application/json": { schema: paginatorSchema(blogViewModelSchema) } },
            description: "Paginated list of blogs",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Invalid query params",
          },
        },
        summary: "Get all blogs",
        tags: ["Blogs"],
      },
      post: {
        operationId: "createBlog",
        requestBody: {
          content: { "application/json": { schema: BlogInputSchema } },
          required: true,
        },
        responses: {
          "201": {
            content: { "application/json": { schema: blogViewModelSchema } },
            description: "Blog created",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Validation failed",
          },
        },
        summary: "Create a blog",
        tags: ["Blogs"],
      },
    },
    "/api/blogs/lookup": {
      get: {
        operationId: "listBlogLookup",
        parameters: paginationQueryParams,
        responses: {
          "200": {
            content: { "application/json": { schema: paginatorSchema(blogLookupItemSchema) } },
            description: "Paginated lightweight list of blogs (id + name) for dropdowns",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Invalid query params",
          },
        },
        summary: "Lookup blogs — id + name only",
        tags: ["Blogs"],
      },
    },
    "/api/blogs/{id}": {
      delete: {
        operationId: "deleteBlog",
        parameters: [stringIdParam],
        responses: {
          "204": { description: "Blog deleted" },
          "404": { description: "Blog not found" },
        },
        summary: "Delete a blog",
        tags: ["Blogs"],
      },
      get: {
        operationId: "getBlog",
        parameters: [stringIdParam],
        responses: {
          "200": {
            content: { "application/json": { schema: blogViewModelSchema } },
            description: "Blog found",
          },
          "404": { description: "Blog not found" },
        },
        summary: "Get a blog by id",
        tags: ["Blogs"],
      },
      put: {
        operationId: "updateBlog",
        parameters: [stringIdParam],
        requestBody: {
          content: { "application/json": { schema: BlogInputSchema } },
          required: true,
        },
        responses: {
          "204": { description: "Blog updated" },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Validation failed",
          },
          "404": { description: "Blog not found" },
        },
        summary: "Update a blog",
        tags: ["Blogs"],
      },
    },
    "/api/blogs/{id}/posts": {
      get: {
        operationId: "listPostsForBlog",
        parameters: [stringIdParam, ...postsPaginationQueryParams],
        responses: {
          "200": {
            content: { "application/json": { schema: paginatorSchema(postViewModelSchema) } },
            description: "Paginated list of posts for the blog",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Invalid query params",
          },
          "404": { description: "Blog not found" },
        },
        summary: "Get posts by blog id",
        tags: ["Blogs"],
      },
      post: {
        operationId: "createPostForBlog",
        parameters: [stringIdParam],
        requestBody: {
          content: { "application/json": { schema: BlogScopedPostInputSchema } },
          required: true,
        },
        responses: {
          "201": {
            content: { "application/json": { schema: postViewModelSchema } },
            description: "Post created",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Validation failed",
          },
          "404": { description: "Blog not found" },
        },
        summary: "Create a post for a blog",
        tags: ["Blogs"],
      },
    },
  });
}
