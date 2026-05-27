import type { Paginator, QuizGameAnswerViewModel, QuizGamePairViewModel } from "@app/shared";
import type { Request } from "express";

import { MyGamesQuerySchema, QuizGameAnswerInputSchema } from "@app/shared";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { UnauthorizedError } from "../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../core/guards/jwt-auth.guard.js";
import { ZodBodyPipe } from "../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../core/pipes/zod-query.pipe.js";
import { PairQuizGameService } from "../application/pair-quiz-game.service.js";
import { MyGamesQueryDto } from "./input-dto/my-games-query.dto.js";
import { QuizGameAnswerInputDto } from "./input-dto/quiz-game-answer-input.dto.js";

@ApiBearerAuth()
@ApiTags("Pair Quiz Game")
@Controller("api/pair-game-quiz/pairs")
@UseGuards(JwtAuthGuard)
export class PairQuizGameController {
  constructor(private readonly pairQuizGameService: PairQuizGameService) {}

  @ApiOperation({ summary: "Join existing pending pair or create one (public)" })
  @ApiResponse({ description: "Pair joined or created", status: 200 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "User already in active pair", status: 403 })
  @HttpCode(HttpStatus.OK)
  @Post("connection")
  connectToPair(@Req() request: Request): Promise<QuizGamePairViewModel> {
    const user = requireUser(request);
    return this.pairQuizGameService.connectToPair(user);
  }

  @ApiOperation({ summary: "Get current pair (Pending or Active) of the current user" })
  @ApiResponse({ description: "Current pair returned", status: 200 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "No active pair for current user", status: 404 })
  @Get("my-current")
  getCurrentPair(@Req() request: Request): Promise<QuizGamePairViewModel> {
    const user = requireUser(request);
    return this.pairQuizGameService.getCurrentPair(user);
  }

  @ApiBody({ type: QuizGameAnswerInputDto })
  @ApiOperation({ summary: "Submit answer for the next question of the current active pair" })
  @ApiResponse({ description: "Answer accepted", status: 200 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({
    description: "User has no active pair or already answered all questions",
    status: 403,
  })
  @HttpCode(HttpStatus.OK)
  @Post("my-current/answers")
  submitAnswer(
    @Body(new ZodBodyPipe(QuizGameAnswerInputSchema)) body: QuizGameAnswerInputDto,
    @Req() request: Request,
  ): Promise<QuizGameAnswerViewModel> {
    const user = requireUser(request);
    return this.pairQuizGameService.submitAnswer({ currentUser: user, input: body });
  }

  @ApiOperation({ summary: "Get current user's games (any status), paginated" })
  @ApiQuery({ type: MyGamesQueryDto })
  @ApiResponse({ description: "Paginated list of user's games", status: 200 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @Get("my")
  getMyGames(
    @Query(new ZodQueryPipe(MyGamesQuerySchema)) query: MyGamesQueryDto,
    @Req() request: Request,
  ): Promise<Paginator<QuizGamePairViewModel>> {
    const user = requireUser(request);
    return this.pairQuizGameService.getMyGames({ currentUser: user, query });
  }

  @ApiOperation({ summary: "Get a pair by id in any status (current user must be a participant)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Pair returned", status: 200 })
  @ApiResponse({ description: "Invalid id format", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "User is not a participant of the pair", status: 403 })
  @ApiResponse({ description: "Pair not found", status: 404 })
  @Get(":id")
  getPairById(@Param("id") rawId: string, @Req() request: Request): Promise<QuizGamePairViewModel> {
    const user = requireUser(request);
    return this.pairQuizGameService.getPairById({ currentUser: user, rawId });
  }
}

function requireUser(request: Request): { login: string; userId: number } {
  const user = request.user;
  if (!user) throw new UnauthorizedError();
  return { login: user.login, userId: user.userId };
}
