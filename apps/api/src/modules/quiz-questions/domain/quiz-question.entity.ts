import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { QuizQuestionCorrectAnswerEntity } from "./quiz-question-correct-answer.entity.js";

export interface QuizQuestionDoc {
  body: string;
  correctAnswers: string[];
  createdAt: Date;
  id: number;
  published: boolean;
  updatedAt: Date | null;
}

@Entity({ name: "quiz_questions" })
export class QuizQuestionEntity {
  @Column({ type: "text" })
  body!: string;

  @OneToMany(() => QuizQuestionCorrectAnswerEntity, (correctAnswer) => correctAnswer.question, {
    cascade: true,
    eager: false,
  })
  correctAnswerEntities!: QuizQuestionCorrectAnswerEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ default: false, type: "boolean" })
  published!: boolean;

  @Column({ nullable: true, type: "timestamptz" })
  updatedAt!: Date | null;
}
