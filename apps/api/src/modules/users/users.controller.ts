import type {
  CreateUserInput,
  Paginator,
  UpdateUserRoleInput,
  UsersQuery,
  UserViewModel,
} from "@app/shared";
import type { Request } from "express";

import { CreateUserInputSchema, UpdateUserRoleInputSchema, UsersQuerySchema } from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { UnauthorizedError } from "../../lib/errors.js";
import { BasicAuthGuard } from "../../lib/guards/basic-auth.guard.js";
import { JwtAuthGuard } from "../../lib/guards/jwt-auth.guard.js";
import { SuperAdminGuard } from "../../lib/guards/super-admin.guard.js";
import { ZodBodyPipe } from "../../lib/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../lib/pipes/zod-query.pipe.js";
import { UsersService } from "./users.service.js";

@Controller("api/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseGuards(BasicAuthGuard)
  createUser(
    @Body(new ZodBodyPipe(CreateUserInputSchema)) body: CreateUserInput,
  ): Promise<UserViewModel> {
    return this.usersService.createUser(body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  deleteUser(@Param("id") id: string): Promise<void> {
    return this.usersService.deleteUser(id);
  }

  @Get()
  @UseGuards(BasicAuthGuard)
  listUsers(
    @Query(new ZodQueryPipe(UsersQuerySchema)) query: UsersQuery,
  ): Promise<Paginator<UserViewModel>> {
    return this.usersService.getAllUsers(query);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id/role")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  updateUserRole(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(UpdateUserRoleInputSchema)) body: UpdateUserRoleInput,
    @Req() request: Request,
  ): Promise<void> {
    const actor = request.user;
    if (!actor) throw new UnauthorizedError();
    return this.usersService.updateUserRole({
      actorUserId: actor.userId,
      newRole: body.role,
      targetUserId: id,
    });
  }
}
