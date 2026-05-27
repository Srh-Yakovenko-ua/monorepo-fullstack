import type { Paginator, QuizQuestionViewModel } from "@app/shared";

import {
  QuizQuestionInputSchema,
  QuizQuestionPublishInputSchema,
  QuizQuestionsQuerySchema,
} from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
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

import { BadRequestError } from "../../../core/exceptions/errors.js";
import { SuperAdminGuard } from "../../../core/guards/super-admin.guard.js";
import { ZodBodyPipe } from "../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../core/pipes/zod-query.pipe.js";
import { QuizQuestionsService } from "../application/quiz-questions.service.js";
import { QuizQuestionInputDto } from "./input-dto/quiz-question-input.dto.js";
import { QuizQuestionPublishInputDto } from "./input-dto/quiz-question-publish-input.dto.js";
import { QuizQuestionsQueryDto } from "./input-dto/quiz-questions-query.dto.js";

@ApiBearerAuth()
@ApiTags("SA Quiz Questions")
@Controller("api/sa/quiz/questions")
@UseGuards(SuperAdminGuard)
export class QuizQuestionsController {
  constructor(private readonly quizQuestionsService: QuizQuestionsService) {}

  @ApiBody({ type: QuizQuestionInputDto })
  @ApiOperation({ summary: "Create a quiz question (super-admin)" })
  @ApiResponse({ description: "Question created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  createQuestion(
    @Body(new ZodBodyPipe(QuizQuestionInputSchema)) body: QuizQuestionInputDto,
  ): Promise<QuizQuestionViewModel> {
    return this.quizQuestionsService.createQuestion(body);
  }

  @ApiOperation({ summary: "Delete a quiz question by id (super-admin)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Question deleted", status: 204 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Question not found", status: 404 })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuestion(@Param("id") rawId: string): Promise<void> {
    return this.quizQuestionsService.deleteQuestion(parseQuizQuestionId(rawId));
  }

  @ApiOperation({ summary: "List quiz questions with pagination + filters (super-admin)" })
  @ApiQuery({ type: QuizQuestionsQueryDto })
  @ApiResponse({ description: "Paginated list of questions", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @Get()
  listQuestions(
    @Query(new ZodQueryPipe(QuizQuestionsQuerySchema)) query: QuizQuestionsQueryDto,
  ): Promise<Paginator<QuizQuestionViewModel>> {
    return this.quizQuestionsService.getAllQuestions(query);
  }

  @ApiBody({ type: QuizQuestionPublishInputDto })
  @ApiOperation({ summary: "Publish or unpublish a quiz question (super-admin)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Publish status updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Question not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id/publish")
  publishQuestion(
    @Param("id") rawId: string,
    @Body(new ZodBodyPipe(QuizQuestionPublishInputSchema)) body: QuizQuestionPublishInputDto,
  ): Promise<void> {
    return this.quizQuestionsService.setPublishedStatus(parseQuizQuestionId(rawId), body);
  }

  @ApiBody({ type: QuizQuestionInputDto })
  @ApiOperation({ summary: "Update a quiz question by id (super-admin)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Question updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Unauthorized", status: 401 })
  @ApiResponse({ description: "Question not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updateQuestion(
    @Param("id") rawId: string,
    @Body(new ZodBodyPipe(QuizQuestionInputSchema)) body: QuizQuestionInputDto,
  ): Promise<void> {
    return this.quizQuestionsService.updateQuestion(parseQuizQuestionId(rawId), body);
  }
}

function parseQuizQuestionId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new BadRequestError(`Invalid quiz question id: ${raw}`);
  return id;
}
