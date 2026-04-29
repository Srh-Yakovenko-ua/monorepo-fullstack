import "reflect-metadata";
import type { Express } from "express";

import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, type NestExpressApplication } from "@nestjs/platform-express";

import { applyTerminators, buildExpressApp } from "./app.js";
import { AppModule } from "./app.module.js";
import { HttpErrorFilter } from "./lib/http-error.filter.js";

export type HybridApp = {
  expressApp: Express;
  nestApp: NestExpressApplication;
};

export async function createHybridApp(): Promise<HybridApp> {
  const expressApp = buildExpressApp();

  const nestApp = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    { bodyParser: false, logger: false },
  );

  nestApp.useGlobalFilters(new HttpErrorFilter());

  await nestApp.init();

  applyTerminators(expressApp);

  return { expressApp, nestApp };
}
