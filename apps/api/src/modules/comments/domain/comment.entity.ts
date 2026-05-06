import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type Types } from "mongoose";

@Schema({ _id: false, versionKey: false })
export class CommentatorInfo {
  @Prop({ ref: "User", required: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  userLogin!: string;
}

const CommentatorInfoSchema = SchemaFactory.createForClass(CommentatorInfo);

@Schema({ timestamps: false, versionKey: false })
export class Comment {
  @Prop({ required: true, type: CommentatorInfoSchema })
  commentatorInfo!: CommentatorInfo;

  @Prop({ required: true, type: String })
  content!: string;

  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ default: 0, required: true, type: Number })
  dislikesCount!: number;

  @Prop({ default: 0, required: true, type: Number })
  likesCount!: number;

  @Prop({ ref: "Post", required: true, type: MongooseSchema.Types.ObjectId })
  postId!: Types.ObjectId;
}

export interface CommentDoc {
  _id: Types.ObjectId;
  commentatorInfo: { userId: Types.ObjectId; userLogin: string };
  content: string;
  createdAt: Date;
  dislikesCount: number;
  likesCount: number;
  postId: Types.ObjectId;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
