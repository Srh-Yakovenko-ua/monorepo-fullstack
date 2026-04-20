import { BlogInputSchema } from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  createBlog,
  deleteBlog,
  getBlog,
  listBlogs,
  updateBlog,
} from "../controllers/blogs.controller.js";
import { apiErrorResultSchema, registerPaths, stringIdParam } from "../lib/openapi.js";

const router: Router = Router();

router.get("/", listBlogs);
router.post("/", createBlog);
router.get("/:id", getBlog);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

const blogViewModelSchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string(),
  id: z.string(),
  isMembership: z.boolean(),
  name: z.string(),
  websiteUrl: z.string(),
});

registerPaths({
  "/api/blogs": {
    get: {
      operationId: "listBlogs",
      responses: {
        "200": {
          content: { "application/json": { schema: z.array(blogViewModelSchema) } },
          description: "List of all blogs",
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
});

export const blogsRouter: Router = router;
