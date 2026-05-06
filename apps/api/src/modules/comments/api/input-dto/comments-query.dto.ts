import { CommentsQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class CommentsQueryDto extends createZodDto(CommentsQuerySchema) {}
