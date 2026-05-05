import { LIKE_STATUSES } from "@app/shared";
import { z } from "zod";

export const newestLikeSchema = z.object({
  addedAt: z.string(),
  login: z.string(),
  userId: z.string(),
});

export const extendedLikesInfoSchema = z.object({
  dislikesCount: z.number().int(),
  likesCount: z.number().int(),
  myStatus: z.enum(LIKE_STATUSES),
  newestLikes: z.array(newestLikeSchema),
});

export const postViewSchema = z.object({
  blogId: z.string(),
  blogName: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  extendedLikesInfo: extendedLikesInfoSchema,
  id: z.string(),
  shortDescription: z.string(),
  title: z.string(),
});
