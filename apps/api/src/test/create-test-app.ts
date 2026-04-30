import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { type NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";

import { AppModule } from "../app.module.js";
import { HttpErrorFilter } from "../lib/http-error.filter.js";

const JSON_BODY_LIMIT = "1mb";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.useGlobalFilters(new HttpErrorFilter());

  await app.init();
  return app;
}
