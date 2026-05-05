import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { SecurityController } from "./api/security.controller.js";
import { SecurityService } from "./application/security.service.js";
import { Session, SessionSchema } from "./domain/session.entity.js";
import { SessionsRepository } from "./infrastructure/sessions.repository.js";

@Module({
  controllers: [SecurityController],
  exports: [SecurityService, SessionsRepository, MongooseModule],
  imports: [MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }])],
  providers: [SecurityService, SessionsRepository],
})
export class SecurityModule {}
