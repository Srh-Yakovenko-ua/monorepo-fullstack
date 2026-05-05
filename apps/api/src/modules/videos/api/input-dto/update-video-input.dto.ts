import { UpdateVideoInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class UpdateVideoInputDto extends createZodDto(UpdateVideoInputSchema) {}
