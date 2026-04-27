import { PERSISTED_LIKE_STATUSES, type PersistedLikeStatus } from "@app/shared";
import { model, Schema, type Types } from "mongoose";

export interface CommentLikeDoc {
  _id: Types.ObjectId;
  commentId: Types.ObjectId;
  createdAt: Date;
  status: CommentLikeStatus;
  userId: Types.ObjectId;
}

export type CommentLikeStatus = PersistedLikeStatus;

const commentLikeSchema = new Schema<CommentLikeDoc>(
  {
    commentId: { ref: "Comment", required: true, type: Schema.Types.ObjectId },
    createdAt: { default: Date.now, required: true, type: Date },
    status: { enum: [...PERSISTED_LIKE_STATUSES], required: true, type: String },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: false, versionKey: false },
);

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentLikeModel = model<CommentLikeDoc>("CommentLike", commentLikeSchema);
