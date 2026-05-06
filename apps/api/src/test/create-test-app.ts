import "reflect-metadata";

import type { INestApplication, ModuleMetadata } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";

import { env } from "../config/env.js";
import { CoreModule } from "../core/core.module.js";
import { HttpErrorFilter } from "../core/exceptions/http-error.filter.js";
import { RequestIdMiddleware } from "../core/middleware/request-id.middleware.js";

const JSON_BODY_LIMIT = "1mb";

export async function createTestApp(
  imports: NonNullable<ModuleMetadata["imports"]>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(env.mongoUri, {
        retryAttempts: 0,
        serverSelectionTimeoutMS: 3000,
      }),
      CoreModule,
      ...imports,
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useGlobalFilters(new HttpErrorFilter());

  await app.init();
  return app;
}
