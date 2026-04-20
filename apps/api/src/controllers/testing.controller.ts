import type { Request, Response } from "express";

import { HTTP_STATUS } from "../lib/http-status.js";
import { clearAllBlogs } from "../services/blogs.service.js";
import { clearAllPosts } from "../services/posts.service.js";
import { clearAllVideos } from "../services/videos.service.js";

export async function clearAllData(_req: Request, res: Response<void>): Promise<void> {
  await Promise.all([clearAllBlogs(), clearAllPosts(), clearAllVideos()]);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
