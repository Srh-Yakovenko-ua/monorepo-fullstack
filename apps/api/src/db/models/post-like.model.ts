import { PERSISTED_LIKE_STATUSES, type PersistedLikeStatus } from "@app/shared";
import { model, Schema, type Types } from "mongoose";

export interface PostLikeDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  postId: Types.ObjectId;
  status: PostLikeStatus;
  userId: Types.ObjectId;
  userLogin: string;
}

export type PostLikeStatus = PersistedLikeStatus;

const postLikeSchema = new Schema<PostLikeDoc>(
  {
    createdAt: { default: Date.now, required: true, type: Date },
    postId: { ref: "Post", required: true, type: Schema.Types.ObjectId },
    status: { enum: [...PERSISTED_LIKE_STATUSES], required: true, type: String },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    userLogin: { required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostLikeModel = model<PostLikeDoc>("PostLike", postLikeSchema);
