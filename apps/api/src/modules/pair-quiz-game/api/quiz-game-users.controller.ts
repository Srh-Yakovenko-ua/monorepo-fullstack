import type {
  MyStatisticViewModel,
  Paginator,
  TopGamePlayerViewModel,
  TopUsersQuery,
} from "@app/shared";
import type { Request } from "express";

import { TopUsersQuerySchema } from "@app/shared";
import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { UnauthorizedError } from "../../../core/exceptions/errors.js";
import { JwtAuthGuard } from "../../../core/guards/jwt-auth.guard.js";
import { ZodQueryPipe } from "../../../core/pipes/zod-query.pipe.js";
import { PairQuizGameService } from "../application/pair-quiz-game.service.js";
import { TopUsersQueryDto } from "./input-dto/top-users-query.dto.js";

@ApiTags("Pair Quiz Game")
@Controller("api/pair-game-quiz/users")
export class QuizGameUsersController {
  constructor(private readonly pairQuizGameService: PairQuizGameService) {}

  @ApiOperation({ summary: "Get top game players ordered by aggregate game statistic (public)" })
  @ApiQuery({ type: TopUsersQueryDto })
  @ApiResponse({ description: "Paginated list of top players", status: 200 })
  @Get("top")
  getTop(
    @Query(new ZodQueryPipe(TopUsersQuerySchema)) query: TopUsersQuery,
  ): Promise<Paginator<TopGamePlayerViewModel>> {
    return this.pairQuizGameService.getTopPlayers(query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's aggregate statistic over all finished games" })
  @ApiResponse({ description: "Statistic returned", status: 200 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @Get("my-statistic")
  @UseGuards(JwtAuthGuard)
  getMyStatistic(@Req() request: Request): Promise<MyStatisticViewModel> {
    const user = requireUser(request);
    return this.pairQuizGameService.getMyStatistic(user);
  }
}

function requireUser(request: Request): { login: string; userId: number } {
  const user = request.user;
  if (!user) throw new UnauthorizedError();
  return { login: user.login, userId: user.userId };
}
