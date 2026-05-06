import { BlogsQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class BlogsQueryDto extends createZodDto(BlogsQuerySchema) {}
