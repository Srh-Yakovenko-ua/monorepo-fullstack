import { BlogScopedPostInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class BlogScopedPostInputDto extends createZodDto(BlogScopedPostInputSchema) {}
