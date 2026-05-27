import type { QuizGameAnswerStatus } from "@app/shared";

import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type { QuizGameAnswerStatus };

export interface QuizGameAnswerDoc {
  addedAt: Date;
  answerStatus: QuizGameAnswerStatus;
  id: number;
  playerId: number;
  questionId: number;
}

@Entity({ name: "quiz_game_answers" })
export class QuizGameAnswerEntity {
  @Column({ type: "timestamptz" })
  addedAt!: Date;

  @Column({ type: "text" })
  answerStatus!: QuizGameAnswerStatus;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ type: "integer" })
  @Index("idx_quiz_game_answers_player")
  playerId!: number;

  @Column({ type: "integer" })
  questionId!: number;
}
