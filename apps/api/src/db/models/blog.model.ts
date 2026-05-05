import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type Types } from "mongoose";

@Schema({ timestamps: false, versionKey: false })
export class Blog {
  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ required: true, type: String })
  description!: string;

  @Prop({ default: false, required: true, type: Boolean })
  isMembership!: boolean;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ required: true, type: String })
  websiteUrl!: string;
}

export interface BlogDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  description: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
