import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { Module } from "@nestjs/common";

import { env } from "./config/env.js";
import { RequestIdMiddleware } from "./lib/middleware/request-id.middleware.js";
import { RequestLoggerMiddleware } from "./lib/middleware/request-logger.middleware.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BlogsModule } from "./modules/blogs/blogs.module.js";
import { CommentsModule } from "./modules/comments/comments.module.js";
import { DocsModule } from "./modules/docs/docs.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { PostsModule } from "./modules/posts/posts.module.js";
import { SecurityModule } from "./modules/security/security.module.js";
import { TestingModule } from "./modules/testing/testing.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { VideosModule } from "./modules/videos/videos.module.js";

const featureModules = [
  AuthModule,
  BlogsModule,
  CommentsModule,
  HealthModule,
  PostsModule,
  SecurityModule,
  UsersModule,
  VideosModule,
];

const optionalModules = [
  ...(env.nodeEnv !== "production" || env.enableTestingEndpoints ? [TestingModule] : []),
  ...(env.enableSwagger ? [DocsModule] : []),
];

@Module({
  imports: [...featureModules, ...optionalModules],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes("*splat");
  }
}
