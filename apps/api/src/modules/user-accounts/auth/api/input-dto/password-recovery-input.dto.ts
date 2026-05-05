import { PasswordRecoveryInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class PasswordRecoveryInputDto extends createZodDto(PasswordRecoveryInputSchema) {}
