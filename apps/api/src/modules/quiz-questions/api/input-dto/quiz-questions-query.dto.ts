import { QuizQuestionsQuerySchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class QuizQuestionsQueryDto extends createZodDto(QuizQuestionsQuerySchema) {}
