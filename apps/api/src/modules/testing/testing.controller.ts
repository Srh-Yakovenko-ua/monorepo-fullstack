import { Controller, Delete, HttpCode, HttpStatus } from "@nestjs/common";

import * as sessionsRepository from "../../db/repositories/sessions.repository.js";
import * as videosRepository from "../../db/repositories/videos.repository.js";
import { BlogsService } from "../blogs/blogs.service.js";
import { CommentsService } from "../comments/comments.service.js";
import { PostsService } from "../posts/posts.service.js";
import { UsersService } from "../users/users.service.js";

@Controller("api/testing")
export class TestingController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
  ) {}

  @Delete("all-data")
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.blogsService.clearAllBlogs(),
      this.commentsService.clearAllComments(),
      this.postsService.clearAllPosts(),
      this.usersService.clearAllUsers(),
      videosRepository.clearAll(),
      sessionsRepository.clearAll(),
    ]);
  }
}
