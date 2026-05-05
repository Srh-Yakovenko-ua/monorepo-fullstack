import { RegistrationEmailResendingInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class RegistrationEmailResendingInputDto extends createZodDto(
  RegistrationEmailResendingInputSchema,
) {}
