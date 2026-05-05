import { RegistrationConfirmationInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class RegistrationConfirmationInputDto extends createZodDto(
  RegistrationConfirmationInputSchema,
) {}
