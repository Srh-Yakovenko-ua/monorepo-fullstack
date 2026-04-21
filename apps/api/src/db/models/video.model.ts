import type { VideoResolution } from "@app/shared";

import { model, Schema } from "mongoose";

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

const videoSchema = new Schema<VideoDoc>(
  {
    _id: { required: true, type: Number },
    author: { required: true, type: String },
    availableResolutions: { required: true, type: [String] },
    canBeDownloaded: { default: false, required: true, type: Boolean },
    createdAt: { default: Date.now, required: true, type: Date },
    minAgeRestriction: { default: null, type: Number },
    publicationDate: { required: true, type: Date },
    title: { required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

export const VideoModel = model<VideoDoc>("Video", videoSchema);
