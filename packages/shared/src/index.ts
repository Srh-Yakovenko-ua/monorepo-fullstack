import { z } from "zod";

export type ApiError = {
  code?: string;
  message: string;
  requestId?: string;
};

export type ApiHealth = {
  postgres: "down" | "ok";
  status: "degraded" | "down" | "ok";
  timestamp: string;
  uptimeSeconds: number;
};

export const VIDEO_RESOLUTIONS = [
  "P144",
  "P240",
  "P360",
  "P480",
  "P720",
  "P1080",
  "P1440",
  "P2160",
] as const;

export type ApiErrorResult = {
  errorsMessages: FieldError[];
};

export type FieldError = {
  field: string;
  message: string;
};

export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

const videoResolutionSchema = z.enum(VIDEO_RESOLUTIONS);

export const CreateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z
    .array(videoResolutionSchema)
    .min(1, "At least one resolution should be added"),
  title: z.string().min(1).max(40).trim(),
});

export const UpdateVideoInputSchema = z.object({
  author: z.string().min(1).max(20).trim(),
  availableResolutions: z
    .array(videoResolutionSchema)
    .min(1, "At least one resolution should be added"),
  canBeDownloaded: z.boolean(),
  minAgeRestriction: z.number().int().min(1).max(18).nullable(),
  publicationDate: z.iso.datetime(),
  title: z.string().min(1).max(40).trim(),
});

export type CreateVideoInput = z.infer<typeof CreateVideoInputSchema>;
export type UpdateVideoInput = z.infer<typeof UpdateVideoInputSchema>;

export type VideoViewModel = {
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: string;
  id: number;
  minAgeRestriction: null | number;
  publicationDate: string;
  title: string;
};

export const BlogInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(15),
  websiteUrl: z
    .string()
    .max(100, "blogs.form.errors.websiteUrlTooLong")
    .url("blogs.form.errors.websiteUrlInvalid")
    .startsWith("https://", "blogs.form.errors.websiteUrlInvalid"),
});

export type BlogInput = z.infer<typeof BlogInputSchema>;

export type BlogViewModel = {
  createdAt: string;
  description: string;
  id: number;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
};

export const PostInputSchema = z.object({
  blogId: z.coerce.number().int().positive(),
  content: z.string().trim().min(1).max(1000),
  shortDescription: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(30),
});

export type PostInput = z.infer<typeof PostInputSchema>;

export const BlogScopedPostInputSchema = PostInputSchema.omit({ blogId: true });
export type BlogScopedPostInput = z.infer<typeof BlogScopedPostInputSchema>;

export type ExtendedLikesInfoViewModel = {
  dislikesCount: number;
  likesCount: number;
  myStatus: LikeStatus;
  newestLikes: NewestLikeViewModel[];
};

export type NewestLikeViewModel = {
  addedAt: string;
  login: string;
  userId: number;
};

export type Paginator<T> = {
  items: T[];
  page: number;
  pagesCount: number;
  pageSize: number;
  totalCount: number;
};

export type PostViewModel = {
  blogId: number;
  blogName: string;
  content: string;
  createdAt: string;
  extendedLikesInfo: ExtendedLikesInfoViewModel;
  id: number;
  shortDescription: string;
  title: string;
};

export const USER_SORT_FIELDS = ["createdAt", "login", "email"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid email format");

export const CreateUserInputSchema = z.object({
  email: normalizedEmailSchema,
  login: z
    .string()
    .trim()
    .min(3, "Login must be at least 3 characters")
    .max(10, "Login must be at most 10 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Login may only contain letters, digits, _ and -"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const LoginInputSchema = z.object({
  loginOrEmail: z.string().trim().min(1, "loginOrEmail is required").max(100),
  password: z.string().min(1, "password is required").max(72),
});

export type DeviceViewModel = {
  deviceId: string;
  ip: string;
  isCurrent: boolean;
  lastActiveDate: string;
  title: string;
};

export type LoginInput = z.infer<typeof LoginInputSchema>;

export type LoginSuccessViewModel = { accessToken: string };

export const USER_ROLES = ["superAdmin", "admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE = {
  admin: "admin",
  superAdmin: "superAdmin",
  user: "user",
} as const satisfies Record<UserRole, UserRole>;

export const UpdateUserRoleInputSchema = z.object({
  role: z.enum([ROLE.admin, ROLE.user]),
});
export type MeViewModel = { email: string; login: string; role: UserRole; userId: number };

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

export const RegistrationConfirmationInputSchema = z.object({
  code: z.string().min(1, "Code is required"),
});
export type RegistrationConfirmationInput = z.infer<typeof RegistrationConfirmationInputSchema>;

export const RegistrationEmailResendingInputSchema = z.object({
  email: normalizedEmailSchema,
});
export type RegistrationEmailResendingInput = z.infer<typeof RegistrationEmailResendingInputSchema>;

export const PasswordRecoveryInputSchema = z.object({
  email: normalizedEmailSchema,
});
export type PasswordRecoveryInput = z.infer<typeof PasswordRecoveryInputSchema>;

export const NewPasswordInputSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
  recoveryCode: z.string().min(1, "Recovery code is required"),
});
export type NewPasswordInput = z.infer<typeof NewPasswordInputSchema>;

export const CommentUpdateInputSchema = z.object({
  content: z.string().trim().min(20).max(300),
});
export type CommentatorInfo = { userId: number; userLogin: string };

export type CommentUpdateInput = z.infer<typeof CommentUpdateInputSchema>;

export const LIKE_STATUSES = ["None", "Like", "Dislike"] as const;
export type LikeStatus = (typeof LIKE_STATUSES)[number];

export const LIKE_STATUS = {
  Dislike: "Dislike",
  Like: "Like",
  None: "None",
} as const satisfies Record<string, LikeStatus>;

export const PERSISTED_LIKE_STATUSES = ["Like", "Dislike"] as const;
export type PersistedLikeStatus = (typeof PERSISTED_LIKE_STATUSES)[number];

export const LikeInputSchema = z.object({
  likeStatus: z.enum(LIKE_STATUSES, {
    error: `likeStatus must be one of: ${LIKE_STATUSES.join(", ")}`,
  }),
});
export type CommentViewModel = {
  commentatorInfo: CommentatorInfo;
  content: string;
  createdAt: string;
  id: number;
  likesInfo: LikesInfoViewModel;
};

export type LikeInput = z.infer<typeof LikeInputSchema>;

export type LikesInfoViewModel = {
  dislikesCount: number;
  likesCount: number;
  myStatus: LikeStatus;
};

export const LIST_PAGE_SIZE_MAX = 100;

export const UsersQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  searchEmailTerm: z.string().max(100).optional(),
  searchLoginTerm: z.string().max(100).optional(),
  sortBy: z.enum(USER_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type UsersQuery = z.infer<typeof UsersQuerySchema>;

export type UserViewModel = {
  createdAt: string;
  email: string;
  id: string;
  login: string;
  role: UserRole;
};

export const COMMENT_SORT_FIELDS = ["createdAt"] as const;
export type CommentSortField = (typeof COMMENT_SORT_FIELDS)[number];

export const CommentsQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  sortBy: z.enum(COMMENT_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export type CommentsQuery = z.infer<typeof CommentsQuerySchema>;

export const BLOG_SORT_FIELDS = ["createdAt", "name"] as const;
export const POST_SORT_FIELDS = ["createdAt", "title", "blogName"] as const;

export type BlogSortField = (typeof BLOG_SORT_FIELDS)[number];
export type PostSortField = (typeof POST_SORT_FIELDS)[number];

export const PaginationQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  sortBy: z.enum(POST_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const BlogsQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  searchNameTerm: z.string().max(100).optional(),
  sortBy: z.enum(BLOG_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type BlogLookupItem = {
  id: number;
  name: string;
};
export type BlogsQuery = z.infer<typeof BlogsQuerySchema>;

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const QUIZ_QUESTION_BODY_MIN = 10;
export const QUIZ_QUESTION_BODY_MAX = 500;

const trimmedQuizQuestionBodySchema = z
  .string()
  .trim()
  .min(QUIZ_QUESTION_BODY_MIN, `body must be at least ${QUIZ_QUESTION_BODY_MIN} characters`)
  .max(QUIZ_QUESTION_BODY_MAX, `body must be at most ${QUIZ_QUESTION_BODY_MAX} characters`);

const quizCorrectAnswersSchema = z
  .array(z.string().trim().min(1, "correctAnswers entries must be non-empty"))
  .min(1, "correctAnswers must contain at least one answer");

export const QuizQuestionInputSchema = z.object({
  body: trimmedQuizQuestionBodySchema,
  correctAnswers: quizCorrectAnswersSchema,
});

export type QuizQuestionInput = z.infer<typeof QuizQuestionInputSchema>;

export const QuizQuestionPublishInputSchema = z.object({
  published: z.boolean(),
});

export type QuizQuestionPublishInput = z.infer<typeof QuizQuestionPublishInputSchema>;

export const QUIZ_QUESTION_SORT_FIELDS = ["createdAt", "body", "updatedAt", "published"] as const;
export type QuizQuestionSortField = (typeof QUIZ_QUESTION_SORT_FIELDS)[number];

export const QUIZ_QUESTION_PUBLISHED_STATUSES = ["all", "published", "notPublished"] as const;
export type QuizQuestionPublishedStatus = (typeof QUIZ_QUESTION_PUBLISHED_STATUSES)[number];

export const QUIZ_QUESTIONS_PAGE_SIZE_MAX = 100;

const quizQuestionSortBySchema = z
  .string()
  .optional()
  .transform((value) =>
    value && (QUIZ_QUESTION_SORT_FIELDS as readonly string[]).includes(value)
      ? (value as QuizQuestionSortField)
      : ("createdAt" as QuizQuestionSortField),
  );

export const QuizQuestionsQuerySchema = z.object({
  bodySearchTerm: z.string().max(500).optional(),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(QUIZ_QUESTIONS_PAGE_SIZE_MAX).default(10),
  publishedStatus: z.enum(QUIZ_QUESTION_PUBLISHED_STATUSES).default("all"),
  sortBy: quizQuestionSortBySchema,
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type QuizQuestionsQuery = z.infer<typeof QuizQuestionsQuerySchema>;

export type QuizQuestionViewModel = {
  body: string;
  correctAnswers: string[];
  createdAt: string;
  id: string;
  published: boolean;
  updatedAt: null | string;
};

export const QUIZ_GAME_STATUSES = ["PendingSecondPlayer", "Active", "Finished"] as const;
export type QuizGameStatus = (typeof QUIZ_GAME_STATUSES)[number];

export const QUIZ_GAME_ANSWER_STATUSES = ["Correct", "Incorrect"] as const;
export type QuizGameAnswerStatus = (typeof QUIZ_GAME_ANSWER_STATUSES)[number];

export const QUIZ_GAME_QUESTIONS_COUNT = 5;

export const QuizGameAnswerInputSchema = z.object({
  answer: z.string().trim().min(1, "answer must be non-empty"),
});
export type QuizGameAnswerInput = z.infer<typeof QuizGameAnswerInputSchema>;

export type QuizGameAnswerViewModel = {
  addedAt: string;
  answerStatus: QuizGameAnswerStatus;
  questionId: string;
};

export type QuizGamePairViewModel = {
  finishGameDate: null | string;
  firstPlayerProgress: QuizGamePlayerProgressViewModel;
  id: string;
  pairCreatedDate: string;
  questions: null | QuizGameQuestionViewModel[];
  secondPlayerProgress: null | QuizGamePlayerProgressViewModel;
  startGameDate: null | string;
  status: QuizGameStatus;
};

export type QuizGamePlayerProgressViewModel = {
  answers: QuizGameAnswerViewModel[];
  player: { id: string; login: string };
  score: number;
};

export type QuizGameQuestionViewModel = {
  body: string;
  id: string;
};

export const QUIZ_GAME_SORT_FIELDS = [
  "pairCreatedDate",
  "status",
  "startGameDate",
  "finishGameDate",
] as const;
export type QuizGameSortField = (typeof QUIZ_GAME_SORT_FIELDS)[number];

const quizGameSortBySchema = z
  .string()
  .optional()
  .transform(
    (value): QuizGameSortField =>
      value && (QUIZ_GAME_SORT_FIELDS as readonly string[]).includes(value)
        ? (value as QuizGameSortField)
        : "pairCreatedDate",
  );

export const MyGamesQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  sortBy: quizGameSortBySchema,
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type MyGamesQuery = z.infer<typeof MyGamesQuerySchema>;

export interface MyStatisticViewModel {
  avgScores: number;
  drawsCount: number;
  gamesCount: number;
  lossesCount: number;
  sumScore: number;
  winsCount: number;
}

export const TOP_USERS_SORT_FIELDS = [
  "avgScores",
  "sumScore",
  "winsCount",
  "lossesCount",
  "drawsCount",
  "gamesCount",
] as const;
export type TopUsersSortField = (typeof TOP_USERS_SORT_FIELDS)[number];

export const TOP_USERS_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type TopUsersSortDirection = (typeof TOP_USERS_SORT_DIRECTIONS)[number];

export const TOP_USERS_DEFAULT_SORT: readonly string[] = ["avgScores desc", "sumScore desc"];

export const TopUsersQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIST_PAGE_SIZE_MAX).default(10),
  sort: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value): string[] => {
      if (value === undefined) return [...TOP_USERS_DEFAULT_SORT];
      return Array.isArray(value) ? value : [value];
    }),
});

export interface TopGamePlayerViewModel {
  avgScores: number;
  drawsCount: number;
  gamesCount: number;
  lossesCount: number;
  player: { id: string; login: string };
  sumScore: number;
  winsCount: number;
}

export type TopUsersQuery = z.infer<typeof TopUsersQuerySchema>;
