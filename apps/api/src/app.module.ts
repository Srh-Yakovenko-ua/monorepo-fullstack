import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { env } from "./config/env.js";
import { CoreModule } from "./core/core.module.js";
import { RequestIdMiddleware } from "./core/middleware/request-id.middleware.js";
import { RequestLoggerMiddleware } from "./core/middleware/request-logger.middleware.js";
import { BloggersPlatformModule } from "./modules/bloggers-platform/bloggers-platform.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { TestingModule } from "./modules/testing/testing.module.js";
import { UserAccountsModule } from "./modules/user-accounts/user-accounts.module.js";
import { VideosModule } from "./modules/videos/videos.module.js";

const featureModules = [BloggersPlatformModule, HealthModule, UserAccountsModule, VideosModule];

const optionalModules = [
  ...(env.nodeEnv !== "production" || env.enableTestingEndpoints ? [TestingModule] : []),
];

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        lazyConnection: true,
        retryAttempts: 0,
        serverSelectionTimeoutMS: 3000,
        uri: env.mongoUri,
      }),
    }),
    CoreModule,
    ...featureModules,
    ...optionalModules,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes("*splat");
  }
}
