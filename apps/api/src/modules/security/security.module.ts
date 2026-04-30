import { Module } from "@nestjs/common";

import { SecurityController } from "./security.controller.js";
import { registerSecurityOpenApi } from "./security.openapi.js";
import { SecurityService } from "./security.service.js";

registerSecurityOpenApi();

@Module({
  controllers: [SecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
