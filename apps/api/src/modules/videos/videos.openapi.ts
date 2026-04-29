import { CreateVideoInputSchema, UpdateVideoInputSchema } from "@app/shared";
import { z } from "zod";

import { apiErrorResultSchema, integerIdParam, registerPaths } from "../../lib/openapi.js";

const videoViewModelSchema = z.object({
  author: z.string(),
  availableResolutions: z.array(
    z.enum(["P144", "P240", "P360", "P480", "P720", "P1080", "P1440", "P2160"]),
  ),
  canBeDownloaded: z.boolean(),
  createdAt: z.iso.datetime(),
  id: z.number().int(),
  minAgeRestriction: z.number().int().min(1).max(18).nullable(),
  publicationDate: z.iso.datetime(),
  title: z.string(),
});

export function registerVideosOpenApi(): void {
  registerPaths({
    "/api/videos": {
      get: {
        operationId: "listVideos",
        responses: {
          "200": {
            content: { "application/json": { schema: z.array(videoViewModelSchema) } },
            description: "List of all videos",
          },
        },
        summary: "Get all videos",
        tags: ["Videos"],
      },
      post: {
        operationId: "createVideo",
        requestBody: {
          content: {
            "application/json": { schema: CreateVideoInputSchema },
          },
          required: true,
        },
        responses: {
          "201": {
            content: { "application/json": { schema: videoViewModelSchema } },
            description: "Video created",
          },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Validation failed",
          },
        },
        summary: "Create a video",
        tags: ["Videos"],
      },
    },
    "/api/videos/{id}": {
      delete: {
        operationId: "deleteVideo",
        parameters: [integerIdParam],
        responses: {
          "204": { description: "Video deleted" },
          "404": { description: "Video not found" },
        },
        summary: "Delete a video",
        tags: ["Videos"],
      },
      get: {
        operationId: "getVideo",
        parameters: [integerIdParam],
        responses: {
          "200": {
            content: { "application/json": { schema: videoViewModelSchema } },
            description: "Video found",
          },
          "404": { description: "Video not found" },
        },
        summary: "Get a video by id",
        tags: ["Videos"],
      },
      put: {
        operationId: "updateVideo",
        parameters: [integerIdParam],
        requestBody: {
          content: {
            "application/json": { schema: UpdateVideoInputSchema },
          },
          required: true,
        },
        responses: {
          "204": { description: "Video updated" },
          "400": {
            content: { "application/json": { schema: apiErrorResultSchema } },
            description: "Validation failed",
          },
          "404": { description: "Video not found" },
        },
        summary: "Update a video",
        tags: ["Videos"],
      },
    },
  });
}
