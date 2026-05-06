import { CommentUpdateInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class CommentUpdateInputDto extends createZodDto(CommentUpdateInputSchema) {}
