import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SecurityController } from "./api/security.controller.js";
import { SecurityService } from "./application/security.service.js";
import { SessionEntity } from "./domain/session.entity.js";
import { SessionsRepository } from "./infrastructure/sessions.repository.js";

@Module({
  controllers: [SecurityController],
  exports: [SecurityService, SessionsRepository],
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  providers: [SecurityService, SessionsRepository],
})
export class SecurityModule {}
