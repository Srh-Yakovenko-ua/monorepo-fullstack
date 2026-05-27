import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import { createLogger } from "../../../core/logger.js";
import { PairQuizGameService } from "./pair-quiz-game.service.js";

const FINALIZER_INTERVAL_MS = 2000;

@Injectable()
export class QuizGameFinalizerScheduler {
  private readonly log = createLogger("quiz-game.finalizer.scheduler");

  constructor(private readonly pairQuizGameService: PairQuizGameService) {}

  @Interval(FINALIZER_INTERVAL_MS)
  async finalizeExpired(): Promise<void> {
    try {
      await this.pairQuizGameService.finalizeExpiredGames();
    } catch (err) {
      this.log.error({ err }, "Scheduler tick failed");
    }
  }
}
