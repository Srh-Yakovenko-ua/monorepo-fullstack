import { z } from "zod";

export type ApiError = {
  code?: string;
  message: string;
  requestId?: string;
};

export type ApiHealth = {
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
    .regex(
      /^https:\/\/([a-zA-Z0-9_-]+\.)+[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/?$/,
      "blogs.form.errors.websiteUrlInvalid",
    ),
});

export type BlogInput = z.infer<typeof BlogInputSchema>;

export type BlogViewModel = {
  createdAt: string;
  description: string;
  id: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
};

export const PostInputSchema = z.object({
  blogId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(1000),
  shortDescription: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(30),
});

export type PostInput = z.infer<typeof PostInputSchema>;

export const BlogScopedPostInputSchema = PostInputSchema.omit({ blogId: true });
export type BlogScopedPostInput = z.infer<typeof BlogScopedPostInputSchema>;

export type Paginator<T> = {
  items: T[];
  page: number;
  pagesCount: number;
  pageSize: number;
  totalCount: number;
};

export type PostViewModel = {
  blogId: string;
  blogName: string;
  content: string;
  createdAt: string;
  id: string;
  shortDescription: string;
  title: string;
};

export const USER_SORT_FIELDS = ["createdAt", "login", "email"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export const CreateUserInputSchema = z.object({
  email: z
    .string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email format"),
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
export type MeViewModel = { email: string; login: string; role: UserRole; userId: string };

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

export const RegistrationConfirmationInputSchema = z.object({
  code: z.string().min(1, "Code is required"),
});
export type RegistrationConfirmationInput = z.infer<typeof RegistrationConfirmationInputSchema>;

export const RegistrationEmailResendingInputSchema = z.object({
  email: z
    .string()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Invalid email format"),
});
export type RegistrationEmailResendingInput = z.infer<typeof RegistrationEmailResendingInputSchema>;

export const CommentUpdateInputSchema = z.object({
  content: z.string().trim().min(20).max(300),
});
export type CommentatorInfo = { userId: string; userLogin: string };

export type CommentUpdateInput = z.infer<typeof CommentUpdateInputSchema>;

export type CommentViewModel = {
  commentatorInfo: CommentatorInfo;
  content: string;
  createdAt: string;
  id: string;
};

export const UsersQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(10),
  searchEmailTerm: z.string().optional(),
  searchLoginTerm: z.string().optional(),
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
  pageSize: z.coerce.number().int().min(1).default(10),
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
  pageSize: z.coerce.number().int().min(1).default(10),
  sortBy: z.enum(POST_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const BlogsQuerySchema = z.object({
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(10),
  searchNameTerm: z.string().optional(),
  sortBy: z.enum(BLOG_SORT_FIELDS).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type BlogLookupItem = {
  id: string;
  name: string;
};
export type BlogsQuery = z.infer<typeof BlogsQuerySchema>;

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
