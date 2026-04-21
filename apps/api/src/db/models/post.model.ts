import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

export interface PostDoc {
  _id: Types.ObjectId;
  blogId: string;
  blogName: string;
  content: string;
  createdAt: Date;
  shortDescription: string;
  title: string;
}

const postSchema = new Schema<PostDoc>(
  {
    blogId: { required: true, type: String },
    blogName: { required: true, type: String },
    content: { required: true, type: String },
    createdAt: { default: Date.now, required: true, type: Date },
    shortDescription: { required: true, type: String },
    title: { required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

export const PostModel = model<PostDoc>("Post", postSchema);
