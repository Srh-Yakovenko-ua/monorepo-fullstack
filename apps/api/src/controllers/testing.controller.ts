import type { Request, Response } from "express";

import * as sessionsRepository from "../db/repositories/sessions.repository.js";
import * as videosRepository from "../db/repositories/videos.repository.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { clearAllBlogs } from "../services/blogs.service.js";
import { clearAllComments } from "../services/comments.service.js";
import { clearAllPosts } from "../services/posts.service.js";
import { clearAllUsers } from "../services/users.service.js";

export async function clearAllData(_req: Request, res: Response<void>): Promise<void> {
  await Promise.all([
    clearAllBlogs(),
    clearAllComments(),
    clearAllPosts(),
    clearAllUsers(),
    videosRepository.clearAll(),
    sessionsRepository.clearAll(),
  ]);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
