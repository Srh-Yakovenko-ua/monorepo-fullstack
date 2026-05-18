import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { Module } from "@nestjs/common";

import { env } from "./config/env.js";
import { CoreModule } from "./core/core.module.js";
import { DatabaseModule } from "./core/database/database.module.js";
import { RequestIdMiddleware } from "./core/middleware/request-id.middleware.js";
import { RequestLoggerMiddleware } from "./core/middleware/request-logger.middleware.js";
import { BlogsModule } from "./modules/blogs/blogs.module.js";
import { CommentsModule } from "./modules/comments/comments.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { MetricsMiddleware } from "./modules/observability/metrics.middleware.js";
import { MetricsModule } from "./modules/observability/metrics.module.js";
import { PostsModule } from "./modules/posts/posts.module.js";
import { TestingModule } from "./modules/testing/testing.module.js";
import { UserAccountsModule } from "./modules/user-accounts/user-accounts.module.js";
import { VideosModule } from "./modules/videos/videos.module.js";

const featureModules = [
  BlogsModule,
  CommentsModule,
  HealthModule,
  MetricsModule,
  PostsModule,
  UserAccountsModule,
  VideosModule,
];

const optionalModules = [
  ...(env.nodeEnv !== "production" || env.enableTestingEndpoints ? [TestingModule] : []),
];

@Module({
  imports: [DatabaseModule, CoreModule, ...featureModules, ...optionalModules],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, MetricsMiddleware, RequestLoggerMiddleware)
      .forRoutes("*splat");
  }
}
