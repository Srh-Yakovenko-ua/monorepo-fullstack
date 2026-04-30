import type { MiddlewareConsumer, NestModule } from "@nestjs/common";

import { Module } from "@nestjs/common";
import helmet from "helmet";

import { DocsController } from "./docs.controller.js";

@Module({
  controllers: [DocsController],
})
export class DocsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        helmet.contentSecurityPolicy({
          directives: {
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          },
        }),
      )
      .forRoutes(DocsController);
  }
}
