import { PostInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class PostInputDto extends createZodDto(PostInputSchema) {}
