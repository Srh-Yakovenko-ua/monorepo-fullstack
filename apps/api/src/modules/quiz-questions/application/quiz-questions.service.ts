import type {
  Paginator,
  QuizQuestionInput,
  QuizQuestionPublishInput,
  QuizQuestionsQuery,
  QuizQuestionViewModel,
} from "@app/shared";

import { Injectable } from "@nestjs/common";

import type { QuizQuestionDoc } from "../domain/quiz-question.entity.js";

import { BadRequestError, NotFoundError } from "../../../core/exceptions/errors.js";
import { buildPaginator } from "../../../core/paginator.js";
import { QuizQuestionsRepository } from "../infrastructure/quiz-questions.repository.js";

@Injectable()
export class QuizQuestionsService {
  constructor(private readonly quizQuestionsRepository: QuizQuestionsRepository) {}

  async clearAllQuestions(): Promise<void> {
    await this.quizQuestionsRepository.clearAll();
  }

  async createQuestion(input: QuizQuestionInput): Promise<QuizQuestionViewModel> {
    const doc = await this.quizQuestionsRepository.create({
      body: input.body,
      correctAnswers: input.correctAnswers,
    });
    return toQuizQuestionView(doc);
  }

  async deleteQuestion(id: number): Promise<void> {
    const removed = await this.quizQuestionsRepository.remove(id);
    if (!removed) throw new NotFoundError(`Quiz question with id ${id} not found`);
  }

  async getAllQuestions(query: QuizQuestionsQuery): Promise<Paginator<QuizQuestionViewModel>> {
    const { items, totalCount } = await this.quizQuestionsRepository.findPage(query);
    return buildPaginator({
      items: items.map(toQuizQuestionView),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async setPublishedStatus(id: number, input: QuizQuestionPublishInput): Promise<void> {
    const existing = await this.quizQuestionsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Quiz question with id ${id} not found`);

    if (input.published && existing.correctAnswers.length === 0) {
      throw new BadRequestError("Cannot publish a question without correct answers", {
        fields: [
          {
            field: "correctAnswers",
            message: "Cannot publish a question without correct answers",
          },
        ],
      });
    }

    if (existing.published === input.published) {
      return;
    }

    await this.quizQuestionsRepository.updatePublished(id, {
      published: input.published,
      updatedAt: new Date(),
    });
  }

  async updateQuestion(id: number, input: QuizQuestionInput): Promise<void> {
    const existing = await this.quizQuestionsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Quiz question with id ${id} not found`);

    await this.quizQuestionsRepository.update(id, {
      body: input.body,
      correctAnswers: input.correctAnswers,
      updatedAt: new Date(),
    });
  }
}

export function toQuizQuestionView(doc: QuizQuestionDoc): QuizQuestionViewModel {
  return {
    body: doc.body,
    correctAnswers: doc.correctAnswers,
    createdAt: doc.createdAt.toISOString(),
    id: String(doc.id),
    published: doc.published,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}
