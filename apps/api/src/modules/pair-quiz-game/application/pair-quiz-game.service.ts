import type {
  MyGamesQuery,
  MyStatisticViewModel,
  Paginator,
  QuizGameAnswerInput,
  QuizGameAnswerStatus,
  QuizGameAnswerViewModel,
  QuizGamePairViewModel,
  QuizGamePlayerProgressViewModel,
  QuizGameQuestionViewModel,
  QuizGameStatus,
  TopGamePlayerViewModel,
  TopUsersQuery,
  TopUsersSortField,
} from "@app/shared";

import { QUIZ_GAME_QUESTIONS_COUNT, TOP_USERS_SORT_FIELDS } from "@app/shared";
import { Injectable } from "@nestjs/common";

import type { QuizGameAnswerDoc } from "../domain/quiz-game-answer.entity.js";
import type { QuizGamePlayerDoc } from "../domain/quiz-game-player.entity.js";
import type {
  QuizGameQuestionWithBodyDoc,
  QuizGameUserStatisticDoc,
  TopPlayerDoc,
  TopPlayersSortTuple,
} from "../infrastructure/pair-quiz-game.repository.js";

import { HttpError } from "../../../core/exceptions/errors.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../../core/exceptions/errors.js";
import { HTTP_STATUS } from "../../../core/http-status.js";
import { createLogger } from "../../../core/logger.js";
import { buildPaginator } from "../../../core/paginator.js";
import { UsersRepository } from "../../user-accounts/users/infrastructure/users.repository.js";
import { type QuizGameDoc } from "../domain/quiz-game.entity.js";
import { PairQuizGameRepository } from "../infrastructure/pair-quiz-game.repository.js";

const AVG_SCORE_DECIMALS = 2;
const AVG_SCORE_ROUNDING_FACTOR = 10 ** AVG_SCORE_DECIMALS;
const ANSWER_TIMEOUT_MS = 10_000;

const finalizerLog = createLogger("quiz-game.finalizer");

const TOP_USERS_DEFAULT_SORT_TUPLES: readonly TopPlayersSortTuple[] = [
  ["avgScores", "DESC"],
  ["sumScore", "DESC"],
];

const TOP_USERS_SORT_FIELD_SET: ReadonlySet<TopUsersSortField> = new Set(TOP_USERS_SORT_FIELDS);

interface CurrentUser {
  login: string;
  userId: number;
}

interface GameAggregate {
  answers: QuizGameAnswerDoc[];
  firstPlayer: QuizGamePlayerDoc;
  firstPlayerLogin: string;
  game: QuizGameDoc;
  questions: QuizGameQuestionWithBodyDoc[];
  secondPlayer: null | QuizGamePlayerDoc;
  secondPlayerLogin: null | string;
}

@Injectable()
export class PairQuizGameService {
  constructor(
    private readonly pairQuizGameRepository: PairQuizGameRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async clearAllGames(): Promise<void> {
    await this.pairQuizGameRepository.clearAll();
  }

  async connectToPair(currentUser: CurrentUser): Promise<QuizGamePairViewModel> {
    await this.finalizeExpiredGames();
    const game = await this.pairQuizGameRepository.runInTransaction(async (manager) => {
      const existing = await this.pairQuizGameRepository.tx_findExistingGameForUser({
        manager,
        userId: currentUser.userId,
      });
      if (existing) {
        throw new ForbiddenError("User already participating in active pair");
      }

      const pendingGame = await this.pairQuizGameRepository.tx_findPendingGameExcludingUser({
        manager,
        userId: currentUser.userId,
      });

      if (!pendingGame) {
        return this.pairQuizGameRepository.tx_createPendingPair({
          firstPlayerUserId: currentUser.userId,
          manager,
        });
      }

      const questionIds = await this.pairQuizGameRepository.tx_pickRandomPublishedQuestionIds({
        limit: QUIZ_GAME_QUESTIONS_COUNT,
        manager,
      });
      if (questionIds.length < QUIZ_GAME_QUESTIONS_COUNT) {
        throw new HttpError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          "Not enough published questions to start a game",
        );
      }

      await this.pairQuizGameRepository.tx_attachQuestionsToGame({
        gameId: pendingGame.id,
        manager,
        questionIds,
      });

      const startedAt = new Date();
      await this.pairQuizGameRepository.tx_attachSecondPlayer({
        gameId: pendingGame.id,
        manager,
        secondPlayerUserId: currentUser.userId,
        startedAt,
      });

      const activatedGame: QuizGameDoc = {
        ...pendingGame,
        startGameDate: startedAt,
        status: "Active",
      };
      return activatedGame;
    });

    return this.buildPairView(game);
  }

  async finalizeExpiredGames(): Promise<void> {
    let expiredCandidates: number[];
    try {
      expiredCandidates = await this.pairQuizGameRepository.findExpiredActiveGameIds();
    } catch (err) {
      finalizerLog.error({ err }, "Failed to load expired active game ids");
      return;
    }
    for (const gameId of expiredCandidates) {
      try {
        await this.finalizeExpiredGame(gameId);
      } catch (err) {
        finalizerLog.error({ err, gameId }, "Failed to finalize expired game");
      }
    }
  }

  async getCurrentPair(currentUser: CurrentUser): Promise<QuizGamePairViewModel> {
    await this.finalizeExpiredGames();
    const game = await this.pairQuizGameRepository.findCurrentGameForUser(currentUser.userId);
    if (!game) throw new NotFoundError("No active pair for current user");
    return this.buildPairView(game);
  }

  async getMyGames({
    currentUser,
    query,
  }: {
    currentUser: CurrentUser;
    query: MyGamesQuery;
  }): Promise<Paginator<QuizGamePairViewModel>> {
    await this.finalizeExpiredGames();
    const { pageIds, totalCount } = await this.pairQuizGameRepository.findGamePageIdsForUser({
      query,
      userId: currentUser.userId,
    });

    if (pageIds.length === 0) {
      return buildPaginator({
        items: [],
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        totalCount,
      });
    }

    const games = await this.pairQuizGameRepository.findGamesByIdsOrdered({
      gameIds: pageIds,
      query,
    });

    const items: QuizGamePairViewModel[] = [];
    for (const game of games) {
      items.push(await this.buildPairView(game));
    }

    return buildPaginator({
      items,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async getMyStatistic(currentUser: CurrentUser): Promise<MyStatisticViewModel> {
    await this.finalizeExpiredGames();
    const aggregate = await this.pairQuizGameRepository.findUserStatistic(currentUser.userId);
    return mapStatisticToViewModel(aggregate);
  }

  async getPairById({
    currentUser,
    rawId,
  }: {
    currentUser: CurrentUser;
    rawId: string;
  }): Promise<QuizGamePairViewModel> {
    await this.finalizeExpiredGames();
    if (!/^\d+$/.test(rawId)) {
      throw new BadRequestError("Invalid id format", {
        fields: [{ field: "id", message: "Invalid id format" }],
      });
    }
    const gameId = Number(rawId);
    const game = await this.pairQuizGameRepository.findGameById(gameId);
    if (!game) throw new NotFoundError(`Pair with id ${rawId} not found`);

    const players = await this.pairQuizGameRepository.findPlayersByGameId(gameId);
    const isParticipant = players.some((player) => player.userId === currentUser.userId);
    if (!isParticipant) throw new ForbiddenError("User is not a participant of this pair");

    return this.buildPairViewWithPlayers({ game, players });
  }

  async getTopPlayers(query: TopUsersQuery): Promise<Paginator<TopGamePlayerViewModel>> {
    await this.finalizeExpiredGames();
    const parsedSort = parseTopUsersSort(query.sort);
    const sort = parsedSort.length === 0 ? [...TOP_USERS_DEFAULT_SORT_TUPLES] : parsedSort;

    const { items, totalCount } = await this.pairQuizGameRepository.findTopPlayers({
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      sort,
    });

    return buildPaginator({
      items: items.map(toTopPlayerView),
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async submitAnswer({
    currentUser,
    input,
  }: {
    currentUser: CurrentUser;
    input: QuizGameAnswerInput;
  }): Promise<QuizGameAnswerViewModel> {
    await this.finalizeExpiredGames();
    return this.pairQuizGameRepository.runInTransaction(async (manager) => {
      const activeGame = await this.pairQuizGameRepository.tx_findActiveGameForUserLocked({
        manager,
        userId: currentUser.userId,
      });
      if (!activeGame) throw new ForbiddenError("User has no active pair");

      const players = await this.pairQuizGameRepository.tx_findPlayersByGameId({
        gameId: activeGame.id,
        manager,
      });
      const currentPlayer = players.find((player) => player.userId === currentUser.userId);
      if (!currentPlayer) {
        throw new HttpError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          "Current player not found in active game",
        );
      }

      const alreadyAnsweredCount = await this.pairQuizGameRepository.tx_countAnswersByPlayer({
        manager,
        playerId: currentPlayer.id,
      });
      if (alreadyAnsweredCount >= QUIZ_GAME_QUESTIONS_COUNT) {
        throw new ForbiddenError("Player already answered all questions");
      }

      const questions = await this.pairQuizGameRepository.tx_findGameQuestionsWithBody({
        gameId: activeGame.id,
        manager,
      });
      const nextQuestion = questions[alreadyAnsweredCount];
      if (!nextQuestion) {
        throw new HttpError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          "Next question not found for active game",
        );
      }

      const correctAnswers = await this.pairQuizGameRepository.tx_loadQuestionCorrectAnswers({
        manager,
        questionId: nextQuestion.questionId,
      });

      const answerStatus = resolveAnswerStatus({
        correctAnswers,
        submittedAnswer: input.answer,
      });

      const insertedAnswer = await this.pairQuizGameRepository.tx_insertAnswer({
        answerStatus,
        manager,
        playerId: currentPlayer.id,
        questionId: nextQuestion.questionId,
      });

      if (answerStatus === "Correct") {
        await this.pairQuizGameRepository.tx_updatePlayerScore({
          delta: 1,
          manager,
          playerId: currentPlayer.id,
        });
      }

      const isFinalAnswerForPlayer = alreadyAnsweredCount + 1 === QUIZ_GAME_QUESTIONS_COUNT;
      if (isFinalAnswerForPlayer) {
        await this.pairQuizGameRepository.tx_markPlayerFinished({
          manager,
          playerId: currentPlayer.id,
        });

        const refreshedPlayers = await this.pairQuizGameRepository.tx_findPlayersByGameId({
          gameId: activeGame.id,
          manager,
        });
        const allFinished = refreshedPlayers.every((player) => player.finishedAt !== null);
        if (allFinished && refreshedPlayers.length === 2) {
          await this.pairQuizGameRepository.tx_finishGame({
            bonusPlayerId: resolveBonusPlayerId(refreshedPlayers),
            gameId: activeGame.id,
            manager,
          });
        }
      }

      return {
        addedAt: insertedAnswer.addedAt.toISOString(),
        answerStatus: insertedAnswer.answerStatus,
        questionId: String(insertedAnswer.questionId),
      };
    });
  }

  private async buildPairView(game: QuizGameDoc): Promise<QuizGamePairViewModel> {
    const players = await this.pairQuizGameRepository.findPlayersByGameId(game.id);
    return this.buildPairViewWithPlayers({ game, players });
  }

  private async buildPairViewWithPlayers({
    game,
    players,
  }: {
    game: QuizGameDoc;
    players: QuizGamePlayerDoc[];
  }): Promise<QuizGamePairViewModel> {
    const aggregate = await this.loadGameAggregate({ game, players });
    return mapAggregateToViewModel(aggregate);
  }

  private async finalizeExpiredGame(gameId: number): Promise<void> {
    await this.pairQuizGameRepository.runInTransaction(async (manager) => {
      const game = await this.pairQuizGameRepository.tx_lockGameById({ gameId, manager });
      if (!game || game.status !== "Active") return;

      const players = await this.pairQuizGameRepository.tx_findPlayersByGameId({
        gameId,
        manager,
      });
      const winner = players.find((player) => player.finishedAt !== null);
      const loser = players.find((player) => player.finishedAt === null);
      if (!winner || !loser || !winner.finishedAt) return;

      const expiryThreshold = new Date(winner.finishedAt.getTime() + ANSWER_TIMEOUT_MS);
      if (new Date() < expiryThreshold) return;

      const answeredCount = await this.pairQuizGameRepository.tx_countAnswersByPlayer({
        manager,
        playerId: loser.id,
      });
      const missingCount = QUIZ_GAME_QUESTIONS_COUNT - answeredCount;
      if (missingCount > 0) {
        const gameQuestions = await this.pairQuizGameRepository.tx_findGameQuestionsWithBody({
          gameId,
          manager,
        });
        const missingQuestions = gameQuestions.slice(answeredCount);
        await this.pairQuizGameRepository.tx_bulkInsertIncorrectAnswers({
          addedAt: expiryThreshold,
          manager,
          playerId: loser.id,
          questions: missingQuestions,
        });
      }

      await this.pairQuizGameRepository.tx_markPlayerFinished({
        finishedAt: expiryThreshold,
        manager,
        playerId: loser.id,
      });

      const refreshedPlayers = await this.pairQuizGameRepository.tx_findPlayersByGameId({
        gameId,
        manager,
      });
      const refreshedWinner = refreshedPlayers.find(
        (refreshedPlayer) => refreshedPlayer.id === winner.id,
      );
      const bonusPlayerId =
        refreshedWinner && refreshedWinner.score > 0 ? refreshedWinner.id : null;

      await this.pairQuizGameRepository.tx_finishGame({
        bonusPlayerId,
        finishGameDate: expiryThreshold,
        gameId,
        manager,
      });
    });
  }

  private async loadGameAggregate({
    game,
    players,
  }: {
    game: QuizGameDoc;
    players: QuizGamePlayerDoc[];
  }): Promise<GameAggregate> {
    const firstPlayer = players.find((player) => player.position === 1);
    if (!firstPlayer) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "First player not found");
    }
    const secondPlayer = players.find((player) => player.position === 2) ?? null;

    const firstPlayerUser = await this.usersRepository.findById(firstPlayer.userId);
    if (!firstPlayerUser) {
      throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "First player user not found");
    }

    let secondPlayerLogin: null | string = null;
    if (secondPlayer) {
      const secondPlayerUser = await this.usersRepository.findById(secondPlayer.userId);
      if (!secondPlayerUser) {
        throw new HttpError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Second player user not found");
      }
      secondPlayerLogin = secondPlayerUser.login;
    }

    const isPending = game.status === "PendingSecondPlayer";
    const questions = isPending
      ? []
      : await this.pairQuizGameRepository.findGameQuestionsWithBody(game.id);
    const answers = isPending ? [] : await this.pairQuizGameRepository.findAnswersByGameId(game.id);

    return {
      answers,
      firstPlayer,
      firstPlayerLogin: firstPlayerUser.login,
      game,
      questions,
      secondPlayer,
      secondPlayerLogin,
    };
  }
}

function buildPlayerProgress({
  answers,
  login,
  score,
  userId,
}: {
  answers: QuizGameAnswerDoc[];
  login: string;
  score: number;
  userId: number;
}): QuizGamePlayerProgressViewModel {
  const sortedAnswers = [...answers].sort(
    (left, right) => left.addedAt.getTime() - right.addedAt.getTime() || left.id - right.id,
  );
  return {
    answers: sortedAnswers.map(toAnswerView),
    player: { id: String(userId), login },
    score,
  };
}

function isTopUsersSortField(value: string): value is TopUsersSortField {
  return TOP_USERS_SORT_FIELD_SET.has(value as TopUsersSortField);
}

function mapAggregateToViewModel(aggregate: GameAggregate): QuizGamePairViewModel {
  const {
    answers,
    firstPlayer,
    firstPlayerLogin,
    game,
    questions,
    secondPlayer,
    secondPlayerLogin,
  } = aggregate;

  const firstPlayerAnswers = answers.filter((answer) => answer.playerId === firstPlayer.id);

  const firstPlayerProgress = buildPlayerProgress({
    answers: firstPlayerAnswers,
    login: firstPlayerLogin,
    score: firstPlayer.score,
    userId: firstPlayer.userId,
  });

  const secondPlayerProgress =
    secondPlayer && secondPlayerLogin
      ? buildPlayerProgress({
          answers: answers.filter((answer) => answer.playerId === secondPlayer.id),
          login: secondPlayerLogin,
          score: secondPlayer.score,
          userId: secondPlayer.userId,
        })
      : null;

  const questionsView: null | QuizGameQuestionViewModel[] =
    game.status === "PendingSecondPlayer"
      ? null
      : questions.map((question) => ({
          body: question.body,
          id: String(question.questionId),
        }));

  return {
    finishGameDate: game.finishGameDate ? game.finishGameDate.toISOString() : null,
    firstPlayerProgress,
    id: String(game.id),
    pairCreatedDate: game.pairCreatedDate.toISOString(),
    questions: questionsView,
    secondPlayerProgress,
    startGameDate: game.startGameDate ? game.startGameDate.toISOString() : null,
    status: game.status satisfies QuizGameStatus,
  };
}

function mapStatisticToViewModel(doc: QuizGameUserStatisticDoc): MyStatisticViewModel {
  const avgScores =
    doc.gamesCount === 0
      ? 0
      : Math.round((doc.sumScore / doc.gamesCount) * AVG_SCORE_ROUNDING_FACTOR) /
        AVG_SCORE_ROUNDING_FACTOR;
  return {
    avgScores,
    drawsCount: doc.drawsCount,
    gamesCount: doc.gamesCount,
    lossesCount: doc.lossesCount,
    sumScore: doc.sumScore,
    winsCount: doc.winsCount,
  };
}

function parseTopUsersSort(rawSort: string[]): TopPlayersSortTuple[] {
  const result: TopPlayersSortTuple[] = [];
  for (const rawItem of rawSort) {
    const [rawField, rawDirection] = rawItem.trim().split(/\s+/);
    if (!rawField || !isTopUsersSortField(rawField)) continue;
    const direction = rawDirection?.toLowerCase() === "asc" ? "ASC" : "DESC";
    result.push([rawField, direction]);
  }
  return result;
}

function resolveAnswerStatus({
  correctAnswers,
  submittedAnswer,
}: {
  correctAnswers: string[];
  submittedAnswer: string;
}): QuizGameAnswerStatus {
  const normalized = submittedAnswer.trim();
  const matches = correctAnswers.some((candidate) => candidate.trim() === normalized);
  return matches ? "Correct" : "Incorrect";
}

function resolveBonusPlayerId(players: QuizGamePlayerDoc[]): null | number {
  if (players.length !== 2) return null;
  const [left, right] = players;
  if (!left || !right || left.finishedAt === null || right.finishedAt === null) return null;

  const leftFinishedMs = left.finishedAt.getTime();
  const rightFinishedMs = right.finishedAt.getTime();

  if (leftFinishedMs < rightFinishedMs) {
    return left.score > 0 ? left.id : null;
  }
  if (rightFinishedMs < leftFinishedMs) {
    return right.score > 0 ? right.id : null;
  }
  return null;
}

function toAnswerView(answer: QuizGameAnswerDoc): QuizGameAnswerViewModel {
  return {
    addedAt: answer.addedAt.toISOString(),
    answerStatus: answer.answerStatus,
    questionId: String(answer.questionId),
  };
}

function toTopPlayerView(doc: TopPlayerDoc): TopGamePlayerViewModel {
  const rawAvg = doc.gamesCount === 0 ? 0 : doc.sumScore / doc.gamesCount;
  const avgScores = Math.round(rawAvg * AVG_SCORE_ROUNDING_FACTOR) / AVG_SCORE_ROUNDING_FACTOR;
  return {
    avgScores,
    drawsCount: doc.drawsCount,
    gamesCount: doc.gamesCount,
    lossesCount: doc.lossesCount,
    player: { id: String(doc.userId), login: doc.login },
    sumScore: doc.sumScore,
    winsCount: doc.winsCount,
  };
}
