import {
  CreateUserInputSchema,
  UpdateUserRoleInputSchema,
  USER_ROLES,
  UsersQuerySchema,
} from "@app/shared";
import { Router } from "express";
import { z } from "zod";

import {
  createUser,
  deleteUser,
  listUsers,
  updateUserRole,
} from "../controllers/users.controller.js";
import { apiErrorResultSchema, registerPaths, stringIdParam } from "../lib/openapi.js";
import { requireAdminAuth } from "../middleware/require-admin-auth.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireSuperAdmin } from "../middleware/require-super-admin.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router: Router = Router();

router.get("/", requireAdminAuth, validateQuery(UsersQuerySchema), listUsers);
router.post("/", requireAdminAuth, validateBody(CreateUserInputSchema), createUser);
router.put(
  "/:id/role",
  requireAuth,
  requireSuperAdmin,
  validateBody(UpdateUserRoleInputSchema),
  updateUserRole,
);
router.delete("/:id", requireAdminAuth, deleteUser);

const userViewModelSchema = z.object({
  createdAt: z.iso.datetime(),
  email: z.string(),
  id: z.string(),
  login: z.string(),
  role: z.enum(USER_ROLES),
});

function paginatorSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pagesCount: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
  });
}

const usersQueryParams = [
  {
    in: "query" as const,
    name: "sortBy",
    schema: {
      default: "createdAt",
      enum: ["createdAt", "login", "email"],
      type: "string" as const,
    },
  },
  {
    in: "query" as const,
    name: "sortDirection",
    schema: { default: "desc", enum: ["asc", "desc"], type: "string" as const },
  },
  {
    in: "query" as const,
    name: "pageNumber",
    schema: { default: 1, format: "int32", minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "pageSize",
    schema: { default: 10, format: "int32", minimum: 1, type: "integer" as const },
  },
  {
    in: "query" as const,
    name: "searchLoginTerm",
    schema: { nullable: true, type: "string" as const },
  },
  {
    in: "query" as const,
    name: "searchEmailTerm",
    schema: { nullable: true, type: "string" as const },
  },
];

registerPaths({
  "/api/users": {
    get: {
      operationId: "listUsers",
      parameters: usersQueryParams,
      responses: {
        "200": {
          content: { "application/json": { schema: paginatorSchema(userViewModelSchema) } },
          description: "Paginated list of users",
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Get all users",
      tags: ["Users"],
    },
    post: {
      operationId: "createUser",
      requestBody: {
        content: { "application/json": { schema: CreateUserInputSchema } },
        required: true,
      },
      responses: {
        "201": {
          content: { "application/json": { schema: userViewModelSchema } },
          description: "User created",
        },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Validation failed or duplicate login/email",
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Create a user",
      tags: ["Users"],
    },
  },
  "/api/users/{id}": {
    delete: {
      operationId: "deleteUser",
      parameters: [stringIdParam],
      responses: {
        "204": { description: "User deleted" },
        "400": { description: "Cannot delete super-admin" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "User not found" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Delete a user",
      tags: ["Users"],
    },
  },
  "/api/users/{id}/role": {
    put: {
      operationId: "updateUserRole",
      parameters: [stringIdParam],
      requestBody: {
        content: {
          "application/json": {
            schema: UpdateUserRoleInputSchema,
          },
        },
        required: true,
      },
      responses: {
        "204": { description: "Role updated" },
        "400": {
          content: { "application/json": { schema: apiErrorResultSchema } },
          description: "Self-role change / target is super-admin / invalid body",
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "User not found" },
      },
      security: [{ bearerAuth: [] }],
      summary: "Update user role (super-admin only)",
      tags: ["Users"],
    },
  },
});

export const usersRouter: Router = router;
