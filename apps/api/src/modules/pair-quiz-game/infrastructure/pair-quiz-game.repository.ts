import type {
  MyGamesQuery,
  QuizGameAnswerStatus,
  QuizGameSortField,
  QuizGameStatus,
  TopUsersSortField,
} from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, type EntityManager, Repository } from "typeorm";

import { type QuizGameAnswerDoc, QuizGameAnswerEntity } from "../domain/quiz-game-answer.entity.js";
import {
  type QuizGamePlayerDoc,
  QuizGamePlayerEntity,
  type QuizGamePlayerPosition,
} from "../domain/quiz-game-player.entity.js";
import { QuizGameQuestionEntity } from "../domain/quiz-game-question.entity.js";
import { type QuizGameDoc, QuizGameEntity } from "../domain/quiz-game.entity.js";

export interface QuizGameQuestionWithBodyDoc {
  body: string;
  correctAnswers: string[];
  gameId: number;
  orderIndex: number;
  questionId: number;
}

interface QuizGameAnswerRow {
  added_at: Date;
  answer_status: QuizGameAnswerStatus;
  id: number;
  player_id: number;
  question_id: number;
}

interface QuizGamePlayerRow {
  finished_at: Date | null;
  game_id: number;
  id: number;
  position: number;
  score: number;
  user_id: number;
}

interface QuizGameQuestionWithBodyRow {
  body: string;
  game_id: number;
  order_index: number;
  question_id: number;
}

interface QuizGameRow {
  finish_game_date: Date | null;
  id: number;
  pair_created_date: Date;
  start_game_date: Date | null;
  status: QuizGameStatus;
}

const VALID_POSITIONS: readonly QuizGamePlayerPosition[] = [1, 2];

const QUIZ_GAME_SORT_COLUMN_BY_FIELD: Record<QuizGameSortField, string> = {
  finishGameDate: "g.finish_game_date",
  pairCreatedDate: "g.pair_created_date",
  startGameDate: "g.start_game_date",
  status: "g.status",
};

export interface QuizGameUserStatisticDoc {
  drawsCount: number;
  gamesCount: number;
  lossesCount: number;
  sumScore: number;
  winsCount: number;
}

export interface TopPlayerDoc {
  drawsCount: number;
  gamesCount: number;
  login: string;
  lossesCount: number;
  sumScore: number;
  userId: number;
  winsCount: number;
}

export type TopPlayersSortTuple = readonly [TopUsersSortField, "ASC" | "DESC"];

const TOP_PLAYERS_SORT_COLUMN_BY_FIELD: Record<TopUsersSortField, string> = {
  avgScores: "avg_scores",
  drawsCount: "draws_count",
  gamesCount: "games_count",
  lossesCount: "losses_count",
  sumScore: "sum_score",
  winsCount: "wins_count",
};

interface TopPlayerRow {
  draws_count: string;
  games_count: string;
  login: string;
  losses_count: string;
  sum_score: string;
  user_id: number;
  wins_count: string;
}

function buildTopPlayersOrderBy(sort: TopPlayersSortTuple[]): string {
  const userSortClauses = sort.map(
    ([field, direction]) => `${TOP_PLAYERS_SORT_COLUMN_BY_FIELD[field]} ${direction}`,
  );
  return [...userSortClauses, "u.id ASC"].join(", ");
}

function isValidPosition(value: number): value is QuizGamePlayerPosition {
  return VALID_POSITIONS.includes(value as QuizGamePlayerPosition);
}

function mapAnswerRow(row: QuizGameAnswerRow): QuizGameAnswerDoc {
  return {
    addedAt: row.added_at,
    answerStatus: row.answer_status,
    id: row.id,
    playerId: row.player_id,
    questionId: row.question_id,
  };
}

function mapGameRow(row: QuizGameRow): QuizGameDoc {
  return {
    finishGameDate: row.finish_game_date,
    id: row.id,
    pairCreatedDate: row.pair_created_date,
    startGameDate: row.start_game_date,
    status: row.status,
  };
}

function mapPlayerRow(row: QuizGamePlayerRow): QuizGamePlayerDoc {
  const position = row.position;
  if (!isValidPosition(position)) {
    throw new Error(`Invalid quiz_game_players.position value: ${String(position)}`);
  }
  return {
    finishedAt: row.finished_at,
    gameId: row.game_id,
    id: row.id,
    position,
    score: row.score,
    userId: row.user_id,
  };
}

@Injectable()
export class PairQuizGameRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(QuizGameEntity)
    private readonly gameRepository: Repository<QuizGameEntity>,
    @InjectRepository(QuizGameQuestionEntity)
    private readonly gameQuestionRepository: Repository<QuizGameQuestionEntity>,
    @InjectRepository(QuizGameAnswerEntity)
    private readonly gameAnswerRepository: Repository<QuizGameAnswerEntity>,
    @InjectRepository(QuizGamePlayerEntity)
    private readonly gamePlayerRepository: Repository<QuizGamePlayerEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.gameAnswerRepository.createQueryBuilder().delete().execute();
    await this.gameQuestionRepository.createQueryBuilder().delete().execute();
    await this.gamePlayerRepository.createQueryBuilder().delete().execute();
    await this.gameRepository.createQueryBuilder().delete().execute();
  }

  async findAnswersByGameId(gameId: number): Promise<QuizGameAnswerDoc[]> {
    const rows = await this.gameAnswerRepository.query<QuizGameAnswerRow[]>(
      `SELECT a.id, a.player_id, a.question_id, a.answer_status, a.added_at
       FROM quiz_game_answers a
       JOIN quiz_game_players p ON p.id = a.player_id
       WHERE p.game_id = $1
       ORDER BY a.added_at ASC, a.id ASC`,
      [gameId],
    );
    return rows.map(mapAnswerRow);
  }

  async findCurrentGameForUser(userId: number): Promise<null | QuizGameDoc> {
    const rows = await this.gameRepository.query<QuizGameRow[]>(
      `SELECT g.id, g.status, g.pair_created_date, g.start_game_date, g.finish_game_date
       FROM quiz_game_pairs g
       JOIN quiz_game_players p ON p.game_id = g.id
       WHERE p.user_id = $1
         AND g.status IN ('PendingSecondPlayer', 'Active')
       LIMIT 1`,
      [userId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async findExpiredActiveGameIds(): Promise<number[]> {
    const rows = await this.gameRepository.query<{ id: number }[]>(
      `SELECT g.id
       FROM quiz_game_pairs g
       JOIN quiz_game_players winner
         ON winner.game_id = g.id AND winner.finished_at IS NOT NULL
       JOIN quiz_game_players loser
         ON loser.game_id = g.id
        AND loser.id <> winner.id
        AND loser.finished_at IS NULL
       WHERE g.status = 'Active'
         AND winner.finished_at + interval '10 seconds' <= now()`,
    );
    return rows.map((row) => row.id);
  }

  async findGameById(gameId: number): Promise<null | QuizGameDoc> {
    const rows = await this.gameRepository.query<QuizGameRow[]>(
      `SELECT id, status, pair_created_date, start_game_date, finish_game_date
       FROM quiz_game_pairs
       WHERE id = $1`,
      [gameId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async findGamePageIdsForUser({
    query,
    userId,
  }: {
    query: MyGamesQuery;
    userId: number;
  }): Promise<{ pageIds: number[]; totalCount: number }> {
    const sortColumn = QUIZ_GAME_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;

    const idsSql = `
      SELECT g.id
      FROM quiz_game_pairs g
      JOIN quiz_game_players p ON p.game_id = g.id
      WHERE p.user_id = $1
      ORDER BY ${sortColumn} ${sortDirection}, g.pair_created_date DESC, g.id DESC
      LIMIT $2 OFFSET $3
    `;
    const countSql = `
      SELECT COUNT(DISTINCT g.id)::text AS count
      FROM quiz_game_pairs g
      JOIN quiz_game_players p ON p.game_id = g.id
      WHERE p.user_id = $1
    `;

    const [idRows, countRows] = await Promise.all([
      this.gameRepository.query<{ id: number }[]>(idsSql, [userId, query.pageSize, offset]),
      this.gameRepository.query<{ count: string }[]>(countSql, [userId]),
    ]);

    return {
      pageIds: idRows.map((row) => row.id),
      totalCount: Number(countRows[0]?.count ?? 0),
    };
  }

  async findGameQuestionsWithBody(gameId: number): Promise<QuizGameQuestionWithBodyDoc[]> {
    const rows = await this.gameQuestionRepository.query<QuizGameQuestionWithBodyRow[]>(
      `SELECT gq.game_id,
              gq.question_id,
              gq.order_index,
              q.body
       FROM quiz_game_questions gq
       JOIN quiz_questions q ON q.id = gq.question_id
       WHERE gq.game_id = $1
       ORDER BY gq.order_index ASC`,
      [gameId],
    );
    return rows.map((row) => ({
      body: row.body,
      correctAnswers: [],
      gameId: row.game_id,
      orderIndex: row.order_index,
      questionId: row.question_id,
    }));
  }

  async findGamesByIdsOrdered({
    gameIds,
    query,
  }: {
    gameIds: number[];
    query: MyGamesQuery;
  }): Promise<QuizGameDoc[]> {
    if (gameIds.length === 0) return [];
    const sortColumn = QUIZ_GAME_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const rows = await this.gameRepository.query<QuizGameRow[]>(
      `SELECT g.id, g.status, g.pair_created_date, g.start_game_date, g.finish_game_date
       FROM quiz_game_pairs g
       WHERE g.id = ANY($1::int[])
       ORDER BY ${sortColumn} ${sortDirection}, g.pair_created_date DESC, g.id DESC`,
      [gameIds],
    );
    return rows.map(mapGameRow);
  }

  async findPlayersByGameId(gameId: number): Promise<QuizGamePlayerDoc[]> {
    const rows = await this.gamePlayerRepository.query<QuizGamePlayerRow[]>(
      `SELECT id, game_id, user_id, position, score, finished_at
       FROM quiz_game_players
       WHERE game_id = $1
       ORDER BY position ASC`,
      [gameId],
    );
    return rows.map(mapPlayerRow);
  }

  async findTopPlayers({
    pageNumber,
    pageSize,
    sort,
  }: {
    pageNumber: number;
    pageSize: number;
    sort: TopPlayersSortTuple[];
  }): Promise<{ items: TopPlayerDoc[]; totalCount: number }> {
    const orderByClause = buildTopPlayersOrderBy(sort);
    const offset = (pageNumber - 1) * pageSize;

    const itemsSql = `
      SELECT
        u.id AS user_id,
        u.login AS login,
        COALESCE(SUM(me.score), 0)::int AS sum_score,
        COUNT(*)::int AS games_count,
        COALESCE(AVG(me.score), 0)::float AS avg_scores,
        (COUNT(*) FILTER (WHERE me.score > opp.score))::int AS wins_count,
        (COUNT(*) FILTER (WHERE me.score < opp.score))::int AS losses_count,
        (COUNT(*) FILTER (WHERE me.score = opp.score))::int AS draws_count
      FROM users u
      JOIN quiz_game_players me ON me.user_id = u.id
      JOIN quiz_game_pairs g ON g.id = me.game_id AND g.status = 'Finished'
      JOIN quiz_game_players opp ON opp.game_id = g.id AND opp.user_id <> u.id
      GROUP BY u.id, u.login
      ORDER BY ${orderByClause}
      LIMIT $1 OFFSET $2
    `;

    const countSql = `
      SELECT COUNT(*)::text AS count FROM (
        SELECT u.id
        FROM users u
        JOIN quiz_game_players me ON me.user_id = u.id
        JOIN quiz_game_pairs g ON g.id = me.game_id AND g.status = 'Finished'
        GROUP BY u.id
      ) AS t
    `;

    const [itemRows, countRows] = await Promise.all([
      this.gameRepository.query<(TopPlayerRow & { avg_scores: number })[]>(itemsSql, [
        pageSize,
        offset,
      ]),
      this.gameRepository.query<{ count: string }[]>(countSql),
    ]);

    return {
      items: itemRows.map((row) => ({
        drawsCount: Number(row.draws_count),
        gamesCount: Number(row.games_count),
        login: row.login,
        lossesCount: Number(row.losses_count),
        sumScore: Number(row.sum_score),
        userId: row.user_id,
        winsCount: Number(row.wins_count),
      })),
      totalCount: Number(countRows[0]?.count ?? 0),
    };
  }

  async findUserStatistic(userId: number): Promise<QuizGameUserStatisticDoc> {
    const rows = await this.gameRepository.query<
      {
        draws_count: string;
        games_count: string;
        losses_count: string;
        sum_score: string;
        wins_count: string;
      }[]
    >(
      `SELECT
         COALESCE(SUM(me.score), 0)::text AS sum_score,
         COUNT(*)::text AS games_count,
         COUNT(*) FILTER (WHERE me.score > opp.score)::text AS wins_count,
         COUNT(*) FILTER (WHERE me.score < opp.score)::text AS losses_count,
         COUNT(*) FILTER (WHERE me.score = opp.score)::text AS draws_count
       FROM quiz_game_pairs g
       JOIN quiz_game_players me ON me.game_id = g.id AND me.user_id = $1
       JOIN quiz_game_players opp ON opp.game_id = g.id AND opp.user_id <> $1
       WHERE g.status = 'Finished'`,
      [userId],
    );
    const row = rows[0];
    return {
      drawsCount: Number(row?.draws_count ?? 0),
      gamesCount: Number(row?.games_count ?? 0),
      lossesCount: Number(row?.losses_count ?? 0),
      sumScore: Number(row?.sum_score ?? 0),
      winsCount: Number(row?.wins_count ?? 0),
    };
  }

  async runInTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction("SERIALIZABLE", work);
  }

  async tx_attachQuestionsToGame({
    gameId,
    manager,
    questionIds,
  }: {
    gameId: number;
    manager: EntityManager;
    questionIds: number[];
  }): Promise<void> {
    if (questionIds.length === 0) return;
    const rows = questionIds.map((questionId, index) => ({
      gameId,
      orderIndex: index + 1,
      questionId,
    }));
    await manager.createQueryBuilder().insert().into(QuizGameQuestionEntity).values(rows).execute();
  }

  async tx_attachSecondPlayer({
    gameId,
    manager,
    secondPlayerUserId,
    startedAt,
  }: {
    gameId: number;
    manager: EntityManager;
    secondPlayerUserId: number;
    startedAt: Date;
  }): Promise<QuizGamePlayerDoc> {
    const insertedPlayerRows = await manager.query<QuizGamePlayerRow[]>(
      `INSERT INTO quiz_game_players (game_id, user_id, position)
       VALUES ($1, $2, 2)
       RETURNING id, game_id, user_id, position, score, finished_at`,
      [gameId, secondPlayerUserId],
    );
    if (!insertedPlayerRows[0]) throw new Error("Failed to insert second quiz_game_players row");

    await manager.query(
      `UPDATE quiz_game_pairs
       SET status = 'Active',
           start_game_date = $2
       WHERE id = $1`,
      [gameId, startedAt],
    );

    return mapPlayerRow(insertedPlayerRows[0]);
  }

  async tx_bulkInsertIncorrectAnswers({
    addedAt,
    manager,
    playerId,
    questions,
  }: {
    addedAt: Date;
    manager: EntityManager;
    playerId: number;
    questions: QuizGameQuestionWithBodyDoc[];
  }): Promise<void> {
    if (questions.length === 0) return;
    const valueClauses: string[] = [];
    const params: unknown[] = [playerId, addedAt];
    for (const question of questions) {
      params.push(question.questionId);
      valueClauses.push(`($1, $${params.length}, 'Incorrect', $2)`);
    }
    await manager.query(
      `INSERT INTO quiz_game_answers (player_id, question_id, answer_status, added_at)
       VALUES ${valueClauses.join(", ")}`,
      params,
    );
  }

  async tx_countAnswersByPlayer({
    manager,
    playerId,
  }: {
    manager: EntityManager;
    playerId: number;
  }): Promise<number> {
    const rows = await manager.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
       FROM quiz_game_answers
       WHERE player_id = $1`,
      [playerId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async tx_createPendingPair({
    firstPlayerUserId,
    manager,
  }: {
    firstPlayerUserId: number;
    manager: EntityManager;
  }): Promise<QuizGameDoc> {
    const gameRows = await manager.query<QuizGameRow[]>(
      `INSERT INTO quiz_game_pairs (status)
       VALUES ('PendingSecondPlayer')
       RETURNING id, status, pair_created_date, start_game_date, finish_game_date`,
      [],
    );
    if (!gameRows[0]) throw new Error("Failed to insert quiz_game_pairs row");

    await manager.query(
      `INSERT INTO quiz_game_players (game_id, user_id, position)
       VALUES ($1, $2, 1)`,
      [gameRows[0].id, firstPlayerUserId],
    );

    return mapGameRow(gameRows[0]);
  }

  async tx_findActiveGameForUserLocked({
    manager,
    userId,
  }: {
    manager: EntityManager;
    userId: number;
  }): Promise<null | QuizGameDoc> {
    const rows = await manager.query<QuizGameRow[]>(
      `SELECT g.id, g.status, g.pair_created_date, g.start_game_date, g.finish_game_date
       FROM quiz_game_pairs g
       JOIN quiz_game_players p ON p.game_id = g.id
       WHERE p.user_id = $1 AND g.status = 'Active'
       LIMIT 1
       FOR UPDATE OF g`,
      [userId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async tx_findExistingGameForUser({
    manager,
    userId,
  }: {
    manager: EntityManager;
    userId: number;
  }): Promise<null | QuizGameDoc> {
    const rows = await manager.query<QuizGameRow[]>(
      `SELECT g.id, g.status, g.pair_created_date, g.start_game_date, g.finish_game_date
       FROM quiz_game_pairs g
       JOIN quiz_game_players p ON p.game_id = g.id
       WHERE p.user_id = $1
         AND g.status IN ('PendingSecondPlayer', 'Active')
       LIMIT 1`,
      [userId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async tx_findGameQuestionsWithBody({
    gameId,
    manager,
  }: {
    gameId: number;
    manager: EntityManager;
  }): Promise<QuizGameQuestionWithBodyDoc[]> {
    const rows = await manager.query<QuizGameQuestionWithBodyRow[]>(
      `SELECT gq.game_id,
              gq.question_id,
              gq.order_index,
              q.body
       FROM quiz_game_questions gq
       JOIN quiz_questions q ON q.id = gq.question_id
       WHERE gq.game_id = $1
       ORDER BY gq.order_index ASC`,
      [gameId],
    );
    return rows.map((row) => ({
      body: row.body,
      correctAnswers: [],
      gameId: row.game_id,
      orderIndex: row.order_index,
      questionId: row.question_id,
    }));
  }

  async tx_findPendingGameExcludingUser({
    manager,
    userId,
  }: {
    manager: EntityManager;
    userId: number;
  }): Promise<null | QuizGameDoc> {
    const rows = await manager.query<QuizGameRow[]>(
      `SELECT g.id, g.status, g.pair_created_date, g.start_game_date, g.finish_game_date
       FROM quiz_game_pairs g
       WHERE g.status = 'PendingSecondPlayer'
         AND NOT EXISTS (
           SELECT 1 FROM quiz_game_players p
           WHERE p.game_id = g.id AND p.user_id = $1
         )
       ORDER BY g.pair_created_date ASC
       LIMIT 1
       FOR UPDATE OF g`,
      [userId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async tx_findPlayersByGameId({
    gameId,
    manager,
  }: {
    gameId: number;
    manager: EntityManager;
  }): Promise<QuizGamePlayerDoc[]> {
    const rows = await manager.query<QuizGamePlayerRow[]>(
      `SELECT id, game_id, user_id, position, score, finished_at
       FROM quiz_game_players
       WHERE game_id = $1
       ORDER BY position ASC`,
      [gameId],
    );
    return rows.map(mapPlayerRow);
  }

  async tx_finishGame({
    bonusPlayerId,
    finishGameDate,
    gameId,
    manager,
  }: {
    bonusPlayerId: null | number;
    finishGameDate?: Date;
    gameId: number;
    manager: EntityManager;
  }): Promise<void> {
    if (finishGameDate) {
      await manager.query(
        `UPDATE quiz_game_pairs
         SET status = 'Finished',
             finish_game_date = $2
         WHERE id = $1`,
        [gameId, finishGameDate],
      );
    } else {
      await manager.query(
        `UPDATE quiz_game_pairs
         SET status = 'Finished',
             finish_game_date = now()
         WHERE id = $1`,
        [gameId],
      );
    }
    if (bonusPlayerId !== null) {
      await manager.query(
        `UPDATE quiz_game_players
         SET score = score + 1
         WHERE id = $1`,
        [bonusPlayerId],
      );
    }
  }

  async tx_insertAnswer({
    answerStatus,
    manager,
    playerId,
    questionId,
  }: {
    answerStatus: QuizGameAnswerStatus;
    manager: EntityManager;
    playerId: number;
    questionId: number;
  }): Promise<QuizGameAnswerDoc> {
    const rows = await manager.query<QuizGameAnswerRow[]>(
      `INSERT INTO quiz_game_answers (player_id, question_id, answer_status, added_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, player_id, question_id, answer_status, added_at`,
      [playerId, questionId, answerStatus],
    );
    if (!rows[0]) throw new Error("Failed to insert quiz_game_answers row");
    return mapAnswerRow(rows[0]);
  }

  async tx_loadQuestionCorrectAnswers({
    manager,
    questionId,
  }: {
    manager: EntityManager;
    questionId: number;
  }): Promise<string[]> {
    const rows = await manager.query<{ answer_text: string }[]>(
      `SELECT answer_text
       FROM quiz_question_correct_answers
       WHERE question_id = $1
       ORDER BY id ASC`,
      [questionId],
    );
    return rows.map((row) => row.answer_text);
  }

  async tx_lockGameById({
    gameId,
    manager,
  }: {
    gameId: number;
    manager: EntityManager;
  }): Promise<null | QuizGameDoc> {
    const rows = await manager.query<QuizGameRow[]>(
      `SELECT id, status, pair_created_date, start_game_date, finish_game_date
       FROM quiz_game_pairs
       WHERE id = $1
       FOR UPDATE`,
      [gameId],
    );
    return rows[0] ? mapGameRow(rows[0]) : null;
  }

  async tx_markPlayerFinished({
    finishedAt,
    manager,
    playerId,
  }: {
    finishedAt?: Date;
    manager: EntityManager;
    playerId: number;
  }): Promise<void> {
    if (finishedAt) {
      await manager.query(
        `UPDATE quiz_game_players
         SET finished_at = $2
         WHERE id = $1`,
        [playerId, finishedAt],
      );
      return;
    }
    await manager.query(
      `UPDATE quiz_game_players
       SET finished_at = now()
       WHERE id = $1`,
      [playerId],
    );
  }

  async tx_pickRandomPublishedQuestionIds({
    limit,
    manager,
  }: {
    limit: number;
    manager: EntityManager;
  }): Promise<number[]> {
    const rows = await manager.query<{ id: number }[]>(
      `SELECT id
       FROM quiz_questions
       WHERE published = true
       ORDER BY RANDOM()
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => row.id);
  }

  async tx_updatePlayerScore({
    delta,
    manager,
    playerId,
  }: {
    delta: number;
    manager: EntityManager;
    playerId: number;
  }): Promise<void> {
    if (delta === 0) return;
    await manager.query(
      `UPDATE quiz_game_players
       SET score = score + $2
       WHERE id = $1`,
      [playerId, delta],
    );
  }
}
