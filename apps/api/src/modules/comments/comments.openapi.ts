import { CommentUpdateInputSchema, LikeInputSchema } from "@app/shared";

import { commentViewSchema } from "../../lib/openapi-schemas/comment.schema.js";
import { apiErrorResultSchema, registerPaths } from "../../lib/openapi.js";

const commentIdParam = {
  in: "path" as const,
  name: "commentId",
  required: true,
  schema: { type: "string" as const },
};

export function registerCommentsOpenApi(): void {
  registerPaths({
    "/api/comments/{commentId}": {
      delete: {
        operationId: "deleteComment",
        parameters: [commentIdParam],
        responses: {
          "204": { description: "Comment deleted" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Comment not found" },
        },
        security: [{ bearerAuth: [] }],
        summary: "Delete a comment",
        tags: ["Comments"],
      },
      get: {
        operationId: "getCommentById",
        parameters: [commentIdParam],
        responses: {
          "200": {
            content: { "application/json": { schema: commentViewSchema } },
            description: "Comment found",
          },
          "404": { description: "Comment not found" },
        },
        summary: "Get comment by id",
        tags: ["Comments"],
      },
      put: {
        operationId: "updateComment",
        parameters: [commentIdParam],
        requestBody: {
          content: { "application/json": { schema: CommentUpdateInputSchema } },
          required: true,
        },
        responses: {
          "204": { description: "Comment updated" },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Invalid request body",
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Comment not found" },
        },
        security: [{ bearerAuth: [] }],
        summary: "Update comment content",
        tags: ["Comments"],
      },
    },
    "/api/comments/{commentId}/like-status": {
      put: {
        operationId: "setCommentLikeStatus",
        parameters: [commentIdParam],
        requestBody: {
          content: { "application/json": { schema: LikeInputSchema } },
          required: true,
        },
        responses: {
          "204": { description: "Like status updated" },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Invalid request body",
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Comment not found" },
        },
        security: [{ bearerAuth: [] }],
        summary: "Set like/dislike status for a comment",
        tags: ["Comments"],
      },
    },
  });
}
