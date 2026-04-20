import { model, Schema } from "mongoose";

interface BlogDoc {
  createdAt: Date;
  description: string;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
}

const blogSchema = new Schema<BlogDoc>(
  {
    createdAt: { default: Date.now, required: true, type: Date },
    description: { required: true, type: String },
    isMembership: { default: false, required: true, type: Boolean },
    name: { required: true, type: String },
    websiteUrl: { required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

export const BlogModel = model<BlogDoc>("Blog", blogSchema);
