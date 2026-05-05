import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { UsersController } from "./api/users.controller.js";
import { registerUsersOpenApi } from "./api/users.openapi.js";
import { UsersService } from "./application/users.service.js";
import { User, UserSchema } from "./domain/user.entity.js";
import { UsersRepository } from "./infrastructure/users.repository.js";

registerUsersOpenApi();

@Module({
  controllers: [UsersController],
  exports: [UsersService, UsersRepository, MongooseModule],
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
