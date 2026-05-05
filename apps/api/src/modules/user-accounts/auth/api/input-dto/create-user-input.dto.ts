import { CreateUserInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class CreateUserInputDto extends createZodDto(CreateUserInputSchema) {}
