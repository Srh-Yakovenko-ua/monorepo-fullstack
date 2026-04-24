import type { Request, Response } from "express";

import * as refreshTokensRepository from "../db/repositories/refresh-tokens.repository.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { clearAllBlogs } from "../services/blogs.service.js";
import { clearAllComments } from "../services/comments.service.js";
import { clearAllPosts } from "../services/posts.service.js";
import { clearAllUsers } from "../services/users.service.js";
import { clearAllVideos } from "../services/videos.service.js";

export async function clearAllData(_req: Request, res: Response<void>): Promise<void> {
  await Promise.all([
    clearAllBlogs(),
    clearAllComments(),
    clearAllPosts(),
    clearAllUsers(),
    clearAllVideos(),
    refreshTokensRepository.clearAll(),
  ]);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
