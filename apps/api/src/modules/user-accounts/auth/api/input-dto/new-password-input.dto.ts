import { NewPasswordInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class NewPasswordInputDto extends createZodDto(NewPasswordInputSchema) {}
