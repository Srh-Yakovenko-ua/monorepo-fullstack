import {
  CommentsQuerySchema,
  CommentUpdateInputSchema,
  PaginationQuerySchema,
  PostInputSchema,
} from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import { createPostComment, listPostComments } from "../controllers/comments.controller.js";
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../controllers/posts.controller.js";
import { apiErrorResultSchema, registerPaths, stringIdParam } from "../lib/openapi.js";
import { requireAuth } from "../middleware/require-auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router: Router = Router();

router.get("/", validateQuery(PaginationQuerySchema), listPosts);
router.post("/", validateBody(PostInputSchema), createPost);
router.get("/:id", getPost);
router.put("/:id", validateBody(PostInputSchema), updatePost);
router.delete("/:id", deletePost);
router.get("/:postId/comments", validateQuery(CommentsQuerySchema), listPostComments);
router.post(
  "/:postId/comments",
  requireAuth,
  validateBody(CommentUpdateInputSchema),
  createPostComment,
);

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

const commentViewSchema = z.object({
  commentatorInfo: z.object({
    userId: z.string(),
    userLogin: z.string(),
  }),
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
});

const postIdParam = {
  in: "path" as const,
  name: "postId",
  required: true,
  schema: { type: "string" as const },
};

const commentsQueryParams = [
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
    schema: { default: "createdAt", enum: ["createdAt"], type: "string" as const },
  },
  {
    in: "query" as const,
    name: "sortDirection",
    schema: { default: "desc", enum: ["asc", "desc"], type: "string" as const },
  },
];

registerPaths({
  "/api/posts/{postId}/comments": {
    get: {
      operationId: "listPostComments",
      parameters: [postIdParam, ...commentsQueryParams],
      responses: {
        "200": {
          content: { "application/json": { schema: paginatorSchema(commentViewSchema) } },
          description: "Paginated list of comments for a post",
        },
        "404": { description: "Post not found" },
      },
      summary: "Get comments for a post",
      tags: ["Comments"],
    },
    post: {
      operationId: "createPostComment",
      parameters: [postIdParam],
      requestBody: {
        content: { "application/json": { schema: CommentUpdateInputSchema } },
        required: true,
      },
      responses: {
        "201": {
          content: { "application/json": { schema: commentViewSchema } },
          description: "Comment created",
        },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Validation failed",
        },
        "401": { description: "Unauthorized" },
        "404": { description: "Post not found" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Create a comment for a post",
      tags: ["Comments"],
    },
  },
});

registerPaths({
  "/api/posts": {
    get: {
      operationId: "listPosts",
      parameters: paginationQueryParams,
      responses: {
        "200": {
          content: { "application/json": { schema: paginatorSchema(postViewModelSchema) } },
          description: "Paginated list of posts",
        },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Invalid query params",
        },
      },
      summary: "Get all posts",
      tags: ["Posts"],
    },
    post: {
      operationId: "createPost",
      requestBody: {
        content: { "application/json": { schema: PostInputSchema } },
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
      },
      summary: "Create a post",
      tags: ["Posts"],
    },
  },
  "/api/posts/{id}": {
    delete: {
      operationId: "deletePost",
      parameters: [stringIdParam],
      responses: {
        "204": { description: "Post deleted" },
        "404": { description: "Post not found" },
      },
      summary: "Delete a post",
      tags: ["Posts"],
    },
    get: {
      operationId: "getPost",
      parameters: [stringIdParam],
      responses: {
        "200": {
          content: { "application/json": { schema: postViewModelSchema } },
          description: "Post found",
        },
        "404": { description: "Post not found" },
      },
      summary: "Get a post by id",
      tags: ["Posts"],
    },
    put: {
      operationId: "updatePost",
      parameters: [stringIdParam],
      requestBody: {
        content: { "application/json": { schema: PostInputSchema } },
        required: true,
      },
      responses: {
        "204": { description: "Post updated" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Validation failed",
        },
        "404": { description: "Post not found" },
      },
      summary: "Update a post",
      tags: ["Posts"],
    },
  },
});

export const postsRouter: Router = router;
