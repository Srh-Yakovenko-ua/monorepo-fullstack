import { LIKE_STATUSES } from "@app/shared";
import { z } from "zod";

export const likesInfoSchema = z.object({
  dislikesCount: z.number().int(),
  likesCount: z.number().int(),
  myStatus: z.enum(LIKE_STATUSES),
});

export const commentViewSchema = z.object({
  commentatorInfo: z.object({
    userId: z.string(),
    userLogin: z.string(),
  }),
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
  likesInfo: likesInfoSchema,
});
