import { LikeInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class LikeInputDto extends createZodDto(LikeInputSchema) {}
