import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersController } from "./api/users.controller.js";
import { UsersService } from "./application/users.service.js";
import { UserEntity } from "./domain/user.entity.js";
import { UsersRepository } from "./infrastructure/users.repository.js";

@Module({
  controllers: [UsersController],
  exports: [UsersService, UsersRepository],
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
