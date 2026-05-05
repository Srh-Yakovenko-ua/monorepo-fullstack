import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Blog, BlogSchema } from "./db/models/blog.model.js";
import { CommentLike, CommentLikeSchema } from "./db/models/comment-like.model.js";
import { Comment, CommentSchema } from "./db/models/comment.model.js";
import { PostLike, PostLikeSchema } from "./db/models/post-like.model.js";
import { Post, PostSchema } from "./db/models/post.model.js";
import { Session, SessionSchema } from "./db/models/session.model.js";
import { User, UserSchema } from "./db/models/user.model.js";
import { Video, VideoSchema } from "./db/models/video.model.js";
import { BlogsRepository } from "./db/repositories/blogs.repository.js";
import { CommentLikesRepository } from "./db/repositories/comment-likes.repository.js";
import { CommentsRepository } from "./db/repositories/comments.repository.js";
import { PostLikesRepository } from "./db/repositories/post-likes.repository.js";
import { PostsRepository } from "./db/repositories/posts.repository.js";
import { SessionsRepository } from "./db/repositories/sessions.repository.js";
import { UsersRepository } from "./db/repositories/users.repository.js";
import { VideosRepository } from "./db/repositories/videos.repository.js";
import { AuthHelper } from "./lib/auth.js";
import { BasicAuthGuard } from "./lib/guards/basic-auth.guard.js";
import { JwtAuthGuard } from "./lib/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "./lib/guards/optional-jwt-auth.guard.js";
import { RefreshSessionGuard } from "./lib/guards/refresh-session.guard.js";

const repositoryProviders = [
  BlogsRepository,
  CommentLikesRepository,
  CommentsRepository,
  PostLikesRepository,
  PostsRepository,
  SessionsRepository,
  UsersRepository,
  VideosRepository,
];

const guardProviders = [BasicAuthGuard, JwtAuthGuard, OptionalJwtAuthGuard, RefreshSessionGuard];

@Global()
@Module({
  exports: [AuthHelper, MongooseModule, ...guardProviders, ...repositoryProviders],
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
      { name: Post.name, schema: PostSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
  ],
  providers: [AuthHelper, ...guardProviders, ...repositoryProviders],
})
export class CoreModule {}
