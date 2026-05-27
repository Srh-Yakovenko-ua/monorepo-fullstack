import { MyGamesQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class MyGamesQueryDto extends createZodDto(MyGamesQuerySchema) {}
