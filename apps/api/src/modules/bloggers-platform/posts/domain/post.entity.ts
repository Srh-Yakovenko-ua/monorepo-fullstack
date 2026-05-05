import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type Types } from "mongoose";

@Schema({ timestamps: false, versionKey: false })
export class Post {
  @Prop({ required: true, type: String })
  blogId!: string;

  @Prop({ required: true, type: String })
  blogName!: string;

  @Prop({ required: true, type: String })
  content!: string;

  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ default: 0, required: true, type: Number })
  dislikesCount!: number;

  @Prop({ default: 0, required: true, type: Number })
  likesCount!: number;

  @Prop({ required: true, type: String })
  shortDescription!: string;

  @Prop({ required: true, type: String })
  title!: string;
}

export interface PostDoc {
  _id: Types.ObjectId;
  blogId: string;
  blogName: string;
  content: string;
  createdAt: Date;
  dislikesCount: number;
  likesCount: number;
  shortDescription: string;
  title: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
