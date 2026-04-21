import { CreateVideoInputSchema, UpdateVideoInputSchema } from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  createVideo,
  deleteVideo,
  getVideo,
  listVideos,
  updateVideo,
} from "../controllers/videos.controller.js";
import { apiErrorResultSchema, integerIdParam, registerPaths } from "../lib/openapi.js";
import { validateBody } from "../middleware/validate.js";

const router: Router = Router();

router.get("/", listVideos);
router.post("/", validateBody(CreateVideoInputSchema), createVideo);
router.get("/:id", getVideo);
router.put("/:id", validateBody(UpdateVideoInputSchema), updateVideo);
router.delete("/:id", deleteVideo);

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

export const videosRouter: Router = router;
