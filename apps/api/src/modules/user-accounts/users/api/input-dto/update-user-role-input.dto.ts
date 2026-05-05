import { UpdateUserRoleInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateUserRoleInputDto extends createZodDto(UpdateUserRoleInputSchema) {}
