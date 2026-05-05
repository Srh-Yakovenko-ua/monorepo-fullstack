import { Controller, Delete, HttpCode, HttpStatus } from "@nestjs/common";

import { BlogsService } from "../blogs/blogs.service.js";
import { CommentsService } from "../comments/comments.service.js";
import { PostsService } from "../posts/posts.service.js";
import { SecurityService } from "../security/security.service.js";
import { UsersService } from "../users/users.service.js";
import { VideosService } from "../videos/videos.service.js";

@Controller("api/testing")
export class TestingController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
    private readonly videosService: VideosService,
    private readonly securityService: SecurityService,
  ) {}

  @Delete("all-data")
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.blogsService.clearAllBlogs(),
      this.commentsService.clearAllComments(),
      this.postsService.clearAllPosts(),
      this.usersService.clearAllUsers(),
      this.videosService.clearAllVideos(),
      this.securityService.clearAllSessions(),
    ]);
  }
}
