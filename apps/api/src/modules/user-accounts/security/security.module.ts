import { Module } from "@nestjs/common";

import { SecurityController } from "./api/security.controller.js";
import { SecurityService } from "./application/security.service.js";
import { SessionsRepository } from "./infrastructure/sessions.repository.js";

@Module({
  controllers: [SecurityController],
  exports: [SecurityService, SessionsRepository],
  providers: [SecurityService, SessionsRepository],
})
export class SecurityModule {}
