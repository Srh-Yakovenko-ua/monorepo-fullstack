import type { CreateUserInput, UpdateUserRoleInput, UserViewModel } from "@app/shared";
import type { Request, Response } from "express";

import { CreateUserInputSchema, UsersQuerySchema } from "@app/shared";

import { UnauthorizedError } from "../lib/errors.js";
import { HTTP_STATUS } from "../lib/http-status.js";
import { validatedQuery } from "../middleware/validate.js";
import * as usersService from "../services/users.service.js";

type IdParams = { id: string };

export async function createUser(
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response<UserViewModel>,
): Promise<void> {
  const input = CreateUserInputSchema.parse(req.body);
  const user = await usersService.createUser(input);
  res.status(HTTP_STATUS.CREATED).json(user);
}

export async function deleteUser(req: Request<IdParams>, res: Response<void>): Promise<void> {
  await usersService.deleteUser(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = validatedQuery(req, UsersQuerySchema);
  const page = await usersService.getAllUsers(query);
  res.status(HTTP_STATUS.OK).json(page);
}

export async function updateUserRole(
  req: Request<IdParams, unknown, UpdateUserRoleInput>,
  res: Response<void>,
): Promise<void> {
  const { id } = req.params;

  const actor = req.user;
  if (!actor) throw new UnauthorizedError();

  await usersService.updateUserRole({
    actorUserId: actor.userId,
    newRole: req.body.role,
    targetUserId: id,
  });

  res.status(HTTP_STATUS.NO_CONTENT).send();
}
