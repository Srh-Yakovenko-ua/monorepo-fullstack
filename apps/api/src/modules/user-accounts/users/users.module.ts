import { Module } from "@nestjs/common";

import { UsersController } from "./api/users.controller.js";
import { UsersService } from "./application/users.service.js";
import { UsersRepository } from "./infrastructure/users.repository.js";

@Module({
  controllers: [UsersController],
  exports: [UsersService, UsersRepository],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
