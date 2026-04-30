import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { registerAuthOpenApi } from "./auth.openapi.js";
import { AuthService } from "./auth.service.js";

registerAuthOpenApi();

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
