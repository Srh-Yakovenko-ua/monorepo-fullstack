import { type VideoResolution } from "@app/shared";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: false, versionKey: false })
export class Video {
  @Prop({ required: true, type: Number })
  _id!: number;

  @Prop({ required: true, type: String })
  author!: string;

  @Prop({ required: true, type: [String] })
  availableResolutions!: VideoResolution[];

  @Prop({ default: false, required: true, type: Boolean })
  canBeDownloaded!: boolean;

  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ default: null, type: Number })
  minAgeRestriction!: null | number;

  @Prop({ required: true, type: Date })
  publicationDate!: Date;

  @Prop({ required: true, type: String })
  title!: string;
}

export interface VideoDoc {
  _id: number;
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: Date;
  minAgeRestriction: null | number;
  publicationDate: Date;
  title: string;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
