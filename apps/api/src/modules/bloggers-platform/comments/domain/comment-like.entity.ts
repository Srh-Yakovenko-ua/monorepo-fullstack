import { PERSISTED_LIKE_STATUSES, type PersistedLikeStatus } from "@app/shared";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type Types } from "mongoose";

export interface CommentLikeDoc {
  _id: Types.ObjectId;
  commentId: Types.ObjectId;
  createdAt: Date;
  status: CommentLikeStatus;
  userId: Types.ObjectId;
}

@Schema({ timestamps: false, versionKey: false })
export class CommentLike {
  @Prop({ ref: "Comment", required: true, type: MongooseSchema.Types.ObjectId })
  commentId!: Types.ObjectId;

  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ enum: [...PERSISTED_LIKE_STATUSES], required: true, type: String })
  status!: CommentLikeStatus;

  @Prop({ ref: "User", required: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;
}

export type CommentLikeStatus = PersistedLikeStatus;

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

CommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });
