import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { QuizQuestionsController } from "./api/quiz-questions.controller.js";
import { QuizQuestionsService } from "./application/quiz-questions.service.js";
import { QuizQuestionCorrectAnswerEntity } from "./domain/quiz-question-correct-answer.entity.js";
import { QuizQuestionEntity } from "./domain/quiz-question.entity.js";
import { QuizQuestionsRepository } from "./infrastructure/quiz-questions.repository.js";

@Module({
  controllers: [QuizQuestionsController],
  exports: [QuizQuestionsService, QuizQuestionsRepository],
  imports: [TypeOrmModule.forFeature([QuizQuestionEntity, QuizQuestionCorrectAnswerEntity])],
  providers: [QuizQuestionsService, QuizQuestionsRepository],
})
export class QuizQuestionsModule {}
