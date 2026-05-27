import type { QuizQuestionSortField, QuizQuestionsQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import { QuizQuestionCorrectAnswerEntity } from "../domain/quiz-question-correct-answer.entity.js";
import { type QuizQuestionDoc, QuizQuestionEntity } from "../domain/quiz-question.entity.js";

export type QuizQuestionCreateInput = Pick<QuizQuestionDoc, "body" | "correctAnswers">;

export type QuizQuestionPublishInput = {
  published: boolean;
  updatedAt: Date;
};

export type QuizQuestionUpdateInput = {
  body: string;
  correctAnswers: string[];
  updatedAt: Date;
};

const QUIZ_QUESTION_SORT_COLUMN_BY_FIELD: Record<QuizQuestionSortField, string> = {
  body: 'question.body COLLATE "C"',
  createdAt: "question.createdAt",
  published: "question.published",
  updatedAt: "question.updatedAt",
};

@Injectable()
export class QuizQuestionsRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(QuizQuestionEntity)
    private readonly repository: Repository<QuizQuestionEntity>,
    @InjectRepository(QuizQuestionCorrectAnswerEntity)
    private readonly correctAnswerRepository: Repository<QuizQuestionCorrectAnswerEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.correctAnswerRepository.createQueryBuilder().delete().execute();
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: QuizQuestionCreateInput): Promise<QuizQuestionDoc> {
    return this.dataSource.transaction(async (manager) => {
      const created = manager.create(QuizQuestionEntity, { body: input.body });
      const saved = await manager.save(created);

      if (input.correctAnswers.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(QuizQuestionCorrectAnswerEntity)
          .values(input.correctAnswers.map((answerText) => ({ answerText, questionId: saved.id })))
          .execute();
      }

      return {
        body: saved.body,
        correctAnswers: input.correctAnswers,
        createdAt: saved.createdAt,
        id: saved.id,
        published: saved.published,
        updatedAt: saved.updatedAt,
      };
    });
  }

  async findById(id: number): Promise<null | QuizQuestionDoc> {
    const found = await this.repository
      .createQueryBuilder("question")
      .leftJoinAndSelect("question.correctAnswerEntities", "answer")
      .where("question.id = :id", { id })
      .orderBy("answer.id", "ASC")
      .getOne();
    return found ? mapEntityWithAnswers(found) : null;
  }

  async findPage(
    query: QuizQuestionsQuery,
  ): Promise<{ items: QuizQuestionDoc[]; totalCount: number }> {
    const sortColumn = QUIZ_QUESTION_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const search = query.bodySearchTerm?.length ? query.bodySearchTerm : null;

    const idsBuilder = this.repository
      .createQueryBuilder("question")
      .select("question.id", "id")
      .orderBy(sortColumn, sortDirection)
      .addOrderBy("question.id", sortDirection)
      .limit(query.pageSize)
      .offset(offset);

    const countBuilder = this.repository.createQueryBuilder("question");

    if (search) {
      idsBuilder.andWhere("question.body ILIKE :term", { term: `%${search}%` });
      countBuilder.andWhere("question.body ILIKE :term", { term: `%${search}%` });
    }

    if (query.publishedStatus === "published") {
      idsBuilder.andWhere("question.published = :published", { published: true });
      countBuilder.andWhere("question.published = :published", { published: true });
    } else if (query.publishedStatus === "notPublished") {
      idsBuilder.andWhere("question.published = :published", { published: false });
      countBuilder.andWhere("question.published = :published", { published: false });
    }

    const [pageIdRows, totalCount] = await Promise.all([
      idsBuilder.getRawMany<{ id: number }>(),
      countBuilder.getCount(),
    ]);

    const pageIds = pageIdRows.map((row) => row.id);
    if (pageIds.length === 0) {
      return { items: [], totalCount };
    }

    const entities = await this.repository
      .createQueryBuilder("question")
      .leftJoinAndSelect("question.correctAnswerEntities", "answer")
      .where({ id: In(pageIds) })
      .orderBy(sortColumn, sortDirection)
      .addOrderBy("question.id", sortDirection)
      .addOrderBy("answer.id", "ASC")
      .getMany();

    return { items: entities.map(mapEntityWithAnswers), totalCount };
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async update(id: number, patch: QuizQuestionUpdateInput): Promise<null | QuizQuestionDoc> {
    return this.dataSource.transaction(async (manager) => {
      const updateResult = await manager.update(
        QuizQuestionEntity,
        { id },
        { body: patch.body, updatedAt: patch.updatedAt },
      );
      if ((updateResult.affected ?? 0) === 0) return null;

      await manager.delete(QuizQuestionCorrectAnswerEntity, { questionId: id });

      if (patch.correctAnswers.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(QuizQuestionCorrectAnswerEntity)
          .values(patch.correctAnswers.map((answerText) => ({ answerText, questionId: id })))
          .execute();
      }

      const found = await manager
        .createQueryBuilder(QuizQuestionEntity, "question")
        .leftJoinAndSelect("question.correctAnswerEntities", "answer")
        .where("question.id = :id", { id })
        .orderBy("answer.id", "ASC")
        .getOne();

      return found ? mapEntityWithAnswers(found) : null;
    });
  }

  async updatePublished(
    id: number,
    patch: QuizQuestionPublishInput,
  ): Promise<null | QuizQuestionDoc> {
    await this.repository.update(
      { id },
      { published: patch.published, updatedAt: patch.updatedAt },
    );
    return this.findById(id);
  }
}

function mapEntityWithAnswers(entity: QuizQuestionEntity): QuizQuestionDoc {
  const answers = entity.correctAnswerEntities ?? [];
  const sorted = [...answers].sort((left, right) => left.id - right.id);
  return {
    body: entity.body,
    correctAnswers: sorted.map((answer) => answer.answerText),
    createdAt: entity.createdAt,
    id: entity.id,
    published: entity.published,
    updatedAt: entity.updatedAt,
  };
}
