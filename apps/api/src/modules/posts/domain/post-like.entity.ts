import { PERSISTED_LIKE_STATUSES, type PersistedLikeStatus } from "@app/shared";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type Types } from "mongoose";

export interface PostLikeDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  postId: Types.ObjectId;
  status: PostLikeStatus;
  userId: Types.ObjectId;
  userLogin: string;
}

@Schema({ timestamps: false, versionKey: false })
export class PostLike {
  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ ref: "Post", required: true, type: MongooseSchema.Types.ObjectId })
  postId!: Types.ObjectId;

  @Prop({ enum: [...PERSISTED_LIKE_STATUSES], required: true, type: String })
  status!: PostLikeStatus;

  @Prop({ ref: "User", required: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  userLogin!: string;
}

export type PostLikeStatus = PersistedLikeStatus;

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);

PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
