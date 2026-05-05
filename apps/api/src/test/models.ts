import mongoose from "mongoose";

import { type CommentLikeDoc, CommentLikeSchema } from "../db/models/comment-like.model.js";
import { type CommentDoc, CommentSchema } from "../db/models/comment.model.js";
import { type PostLikeDoc, PostLikeSchema } from "../db/models/post-like.model.js";
import { type PostDoc, PostSchema } from "../db/models/post.model.js";
import { type UserDoc, UserSchema } from "../db/models/user.model.js";

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
