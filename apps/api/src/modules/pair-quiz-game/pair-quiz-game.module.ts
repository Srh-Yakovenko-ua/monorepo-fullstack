import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { QuizQuestionCorrectAnswerEntity } from "../quiz-questions/domain/quiz-question-correct-answer.entity.js";
import { QuizQuestionEntity } from "../quiz-questions/domain/quiz-question.entity.js";
import { UsersModule } from "../user-accounts/users/users.module.js";
import { PairQuizGameController } from "./api/pair-quiz-game.controller.js";
import { QuizGameUsersController } from "./api/quiz-game-users.controller.js";
import { PairQuizGameService } from "./application/pair-quiz-game.service.js";
import { QuizGameFinalizerScheduler } from "./application/quiz-game-finalizer.scheduler.js";
import { QuizGameAnswerEntity } from "./domain/quiz-game-answer.entity.js";
import { QuizGamePlayerEntity } from "./domain/quiz-game-player.entity.js";
import { QuizGameQuestionEntity } from "./domain/quiz-game-question.entity.js";
import { QuizGameEntity } from "./domain/quiz-game.entity.js";
import { PairQuizGameRepository } from "./infrastructure/pair-quiz-game.repository.js";

@Module({
  controllers: [PairQuizGameController, QuizGameUsersController],
  exports: [PairQuizGameService, PairQuizGameRepository],
  imports: [
    TypeOrmModule.forFeature([
      QuizGameEntity,
      QuizGamePlayerEntity,
      QuizGameQuestionEntity,
      QuizGameAnswerEntity,
      QuizQuestionEntity,
      QuizQuestionCorrectAnswerEntity,
    ]),
    UsersModule,
  ],
  providers: [PairQuizGameService, PairQuizGameRepository, QuizGameFinalizerScheduler],
})
export class PairQuizGameModule {}
