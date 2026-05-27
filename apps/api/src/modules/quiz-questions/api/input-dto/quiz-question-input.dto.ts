import { QuizQuestionInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class QuizQuestionInputDto extends createZodDto(QuizQuestionInputSchema) {}
