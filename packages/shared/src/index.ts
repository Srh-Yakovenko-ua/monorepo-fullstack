import { z } from "zod";

export type ApiError = {
  code?: string;
  message: string;
  requestId?: string;
};

export type ApiHealth = {
  status: "degraded" | "down" | "ok";
  timestamp: string;
  uptimeSeconds: number;
};

export const VIDEO_RESOLUTIONS = [
  "P144",
  "P240",
  "P360",
  "P480",
  "P720",
  "P1080",
  "P1440",
  "P2160",
] as const;

export type ApiErrorResult = {
  errorsMessages: FieldError[];
};

export type FieldError = {
  field: string;
  message: string;
};

export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

const videoResolutionSchema = z.enum(VIDEO_RESOLUTIONS);

export const CreateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z
    .array(videoResolutionSchema)
    .min(1, "At least one resolution should be added"),
  title: z.string().min(1).max(40).trim(),
});

export const UpdateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z
    .array(videoResolutionSchema)
    .min(1, "At least one resolution should be added"),
  canBeDownloaded: z.boolean(),
  minAgeRestriction: z.number().int().min(1).max(18).nullable(),
  publicationDate: z.iso.datetime(),
  title: z.string().min(1).max(40).trim(),
});

export type CreateVideoInput = z.infer<typeof CreateVideoInputSchema>;
export type UpdateVideoInput = z.infer<typeof UpdateVideoInputSchema>;

export type VideoViewModel = {
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: string;
  id: number;
  minAgeRestriction: null | number;
  publicationDate: string;
  title: string;
};

export const BlogInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(15),
  websiteUrl: z
    .string()
    .max(100, "blogs.form.errors.websiteUrlTooLong")
    .regex(
      /^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/,
      "blogs.form.errors.websiteUrlInvalid",
    ),
});

export type BlogInput = z.infer<typeof BlogInputSchema>;

export type BlogViewModel = {
  createdAt: string;
  description: string;
  id: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
};

export const PostInputSchema = z.object({
  blogId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(1000),
  shortDescription: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(30),
});

export type PostInput = z.infer<typeof PostInputSchema>;

export type PostViewModel = {
  blogId: string;
  blogName: string;
  content: string;
  createdAt: string;
  id: string;
  shortDescription: string;
  title: string;
};
