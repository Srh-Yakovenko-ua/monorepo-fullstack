import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";
import { registerHealthOpenApi } from "./health.openapi.js";
import { HealthService } from "./health.service.js";

registerHealthOpenApi();

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
