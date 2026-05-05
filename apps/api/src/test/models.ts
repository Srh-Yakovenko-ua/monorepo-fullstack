import mongoose from "mongoose";

import {
  type CommentLikeDoc,
  CommentLikeSchema,
} from "../modules/bloggers-platform/comments/domain/comment-like.entity.js";
import {
  type CommentDoc,
  CommentSchema,
} from "../modules/bloggers-platform/comments/domain/comment.entity.js";
import {
  type PostLikeDoc,
  PostLikeSchema,
} from "../modules/bloggers-platform/posts/domain/post-like.entity.js";
import { type PostDoc, PostSchema } from "../modules/bloggers-platform/posts/domain/post.entity.js";
import { type UserDoc, UserSchema } from "../modules/user-accounts/users/domain/user.entity.js";

function ensureModel<T>(name: string, schema: mongoose.Schema): mongoose.Model<T> {
  const existing = mongoose.models[name];
  if (existing) return existing as mongoose.Model<T>;
  return mongoose.model(name, schema) as unknown as mongoose.Model<T>;
}

export const UserModel = ensureModel<UserDoc>("User", UserSchema);
export const CommentModel = ensureModel<CommentDoc>("Comment", CommentSchema);
export const CommentLikeModel = ensureModel<CommentLikeDoc>("CommentLike", CommentLikeSchema);
export const PostModel = ensureModel<PostDoc>("Post", PostSchema);
export const PostLikeModel = ensureModel<PostLikeDoc>("PostLike", PostLikeSchema);
