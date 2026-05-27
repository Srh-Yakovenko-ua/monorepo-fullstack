import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { QuizQuestionEntity } from "./quiz-question.entity.js";

@Entity({ name: "quiz_question_correct_answers" })
export class QuizQuestionCorrectAnswerEntity {
  @Column({ type: "text" })
  answerText!: string;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @JoinColumn({ name: "question_id" })
  @ManyToOne(() => QuizQuestionEntity, (question) => question.correctAnswerEntities, {
    onDelete: "CASCADE",
  })
  question!: QuizQuestionEntity;

  @Column({ type: "integer" })
  @Index("idx_quiz_question_correct_answers_question")
  questionId!: number;
}
