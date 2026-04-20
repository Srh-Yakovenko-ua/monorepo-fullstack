import { PostInputSchema } from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../controllers/posts.controller.js";
import { apiErrorResultSchema, registerPaths, stringIdParam } from "../lib/openapi.js";

const router: Router = Router();

router.get("/", listPosts);
router.post("/", createPost);
router.get("/:id", getPost);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

const postViewModelSchema = z.object({
  blogId: z.string(),
  blogName: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  id: z.string(),
  shortDescription: z.string(),
  title: z.string(),
});

registerPaths({
  "/api/posts": {
    get: {
      operationId: "listPosts",
      responses: {
        "200": {
          content: { "application/json": { schema: z.array(postViewModelSchema) } },
          description: "List of all posts",
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
