import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./api/auth.controller.js";
import { registerAuthOpenApi } from "./api/auth.openapi.js";
import { AuthService } from "./application/auth.service.js";

registerAuthOpenApi();

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [UsersModule, SecurityModule],
  providers: [AuthService],
})
export class AuthModule {}
