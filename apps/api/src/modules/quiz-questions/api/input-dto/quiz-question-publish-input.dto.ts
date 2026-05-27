import { QuizQuestionPublishInputSchema } from "@app/shared";
import { createZodDto } from "nestjs-zod";

export class QuizQuestionPublishInputDto extends createZodDto(QuizQuestionPublishInputSchema) {}
