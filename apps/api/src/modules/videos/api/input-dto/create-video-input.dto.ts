import { CreateVideoInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class CreateVideoInputDto extends createZodDto(CreateVideoInputSchema) {}
