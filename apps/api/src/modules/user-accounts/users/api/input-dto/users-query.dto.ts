import { UsersQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class UsersQueryDto extends createZodDto(UsersQuerySchema) {}
