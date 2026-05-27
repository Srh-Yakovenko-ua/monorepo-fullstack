import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

export interface QuizGamePlayerDoc {
  finishedAt: Date | null;
  gameId: number;
  id: number;
  position: QuizGamePlayerPosition;
  score: number;
  userId: number;
}

export type QuizGamePlayerPosition = 1 | 2;

@Entity({ name: "quiz_game_players" })
@Unique("uq_quiz_game_players_game_position", ["gameId", "position"])
@Unique("uq_quiz_game_players_game_user", ["gameId", "userId"])
export class QuizGamePlayerEntity {
  @Column({ nullable: true, type: "timestamptz" })
  finishedAt!: Date | null;

  @Column({ type: "integer" })
  @Index("idx_quiz_game_players_game")
  gameId!: number;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ type: "smallint" })
  position!: QuizGamePlayerPosition;

  @Column({ default: 0, type: "integer" })
  score!: number;

  @Column({ type: "integer" })
  @Index("idx_quiz_game_players_user")
  userId!: number;
}
