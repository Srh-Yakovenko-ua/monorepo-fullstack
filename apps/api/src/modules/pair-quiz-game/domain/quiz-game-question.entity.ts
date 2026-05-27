import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "quiz_game_questions" })
@Unique("uq_quiz_game_questions_game_order", ["gameId", "orderIndex"])
export class QuizGameQuestionEntity {
  @Column({ type: "integer" })
  gameId!: number;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ type: "integer" })
  orderIndex!: number;

  @Column({ type: "integer" })
  questionId!: number;
}
