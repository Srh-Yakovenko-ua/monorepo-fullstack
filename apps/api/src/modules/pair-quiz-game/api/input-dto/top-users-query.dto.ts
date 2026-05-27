import { TopUsersQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class TopUsersQueryDto extends createZodDto(TopUsersQuerySchema) {}
