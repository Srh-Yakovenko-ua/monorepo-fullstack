import { Controller, Delete, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { BlogsService } from "../bloggers-platform/blogs/application/blogs.service.js";
import { CommentsService } from "../bloggers-platform/comments/application/comments.service.js";
import { PostsService } from "../bloggers-platform/posts/application/posts.service.js";
import { SecurityService } from "../user-accounts/security/application/security.service.js";
import { UsersService } from "../user-accounts/users/application/users.service.js";
import { VideosService } from "../videos/application/videos.service.js";

@ApiTags("Testing")
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

  @ApiOperation({ summary: "Wipe all data (test environments only)" })
  @ApiResponse({ description: "All data cleared", status: 204 })
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
