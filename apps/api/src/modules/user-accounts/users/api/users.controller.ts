import type { Paginator, UserViewModel } from "@app/shared";
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
import {
  ApiBasicAuth,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { BadRequestError, UnauthorizedError } from "../../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../../core/guards/jwt-auth.guard.js";
import { SuperAdminGuard } from "../../../../core/guards/super-admin.guard.js";
import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { CreateUserInputDto } from "../../auth/api/input-dto/create-user-input.dto.js";
import { UsersService } from "../application/users.service.js";
import { UpdateUserRoleInputDto } from "./input-dto/update-user-role-input.dto.js";
import { UsersQueryDto } from "./input-dto/users-query.dto.js";

@ApiTags("SA Users")
@Controller("api/sa/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBasicAuth()
  @ApiBody({ type: CreateUserInputDto })
  @ApiOperation({ summary: "Create a new user (super-admin)" })
  @ApiResponse({ description: "User created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseGuards(SuperAdminGuard)
  createUser(
    @Body(new ZodBodyPipe(CreateUserInputSchema)) body: CreateUserInputDto,
  ): Promise<UserViewModel> {
    return this.usersService.createUser(body);
  }

  @ApiBasicAuth()
  @ApiOperation({ summary: "Delete a user by id (super-admin)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "User deleted", status: 204 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "User not found", status: 404 })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SuperAdminGuard)
  deleteUser(@Param("id") rawId: string): Promise<void> {
    return this.usersService.deleteUser(parseUserId(rawId));
  }

  @ApiBasicAuth()
  @ApiOperation({ summary: "List all users (super-admin)" })
  @ApiQuery({ type: UsersQueryDto })
  @ApiResponse({ description: "Paginated list of users", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @Get()
  @UseGuards(SuperAdminGuard)
  listUsers(
    @Query(new ZodQueryPipe(UsersQuerySchema)) query: UsersQueryDto,
  ): Promise<Paginator<UserViewModel>> {
    return this.usersService.getAllUsers(query);
  }

  @ApiBearerAuth()
  @ApiBody({ type: UpdateUserRoleInputDto })
  @ApiOperation({ summary: "Update a user role (super-admin only)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "User role updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Forbidden — super-admin role required", status: 403 })
  @ApiResponse({ description: "User not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id/role")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  updateUserRole(
    @Param("id") rawId: string,
    @Body(new ZodBodyPipe(UpdateUserRoleInputSchema)) body: UpdateUserRoleInputDto,
    @Req() request: Request,
  ): Promise<void> {
    const actor = request.user;
    if (!actor) throw new UnauthorizedError();
    return this.usersService.updateUserRole({
      actorUserId: actor.userId,
      newRole: body.role,
      targetUserId: parseUserId(rawId),
    });
  }
}

function parseUserId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new BadRequestError(`Invalid user id: ${raw}`);
  return id;
}
