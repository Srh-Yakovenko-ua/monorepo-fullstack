import type { QuizGameStatus } from "@app/shared";

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type { QuizGameStatus };

export interface QuizGameDoc {
  finishGameDate: Date | null;
  id: number;
  pairCreatedDate: Date;
  startGameDate: Date | null;
  status: QuizGameStatus;
}

@Entity({ name: "quiz_game_pairs" })
export class QuizGameEntity {
  @Column({ nullable: true, type: "timestamptz" })
  finishGameDate!: Date | null;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @CreateDateColumn({ type: "timestamptz" })
  pairCreatedDate!: Date;

  @Column({ nullable: true, type: "timestamptz" })
  startGameDate!: Date | null;

  @Column({ type: "text" })
  @Index("idx_quiz_game_pairs_status")
  status!: QuizGameStatus;
}
