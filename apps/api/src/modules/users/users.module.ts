import { Module } from "@nestjs/common";

import { UsersController } from "./users.controller.js";
import { registerUsersOpenApi } from "./users.openapi.js";
import { UsersService } from "./users.service.js";

registerUsersOpenApi();

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService],
})
export class UsersModule {}
