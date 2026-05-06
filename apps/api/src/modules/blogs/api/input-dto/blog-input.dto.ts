import { BlogInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class BlogInputDto extends createZodDto(BlogInputSchema) {}
