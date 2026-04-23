import { model, Schema, type Types } from "mongoose";

export interface CommentDoc {
  _id: Types.ObjectId;
  commentatorInfo: { userId: Types.ObjectId; userLogin: string };
  content: string;
  createdAt: Date;
  postId: Types.ObjectId;
}

const commentSchema = new Schema<CommentDoc>(
  {
    commentatorInfo: {
      userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
      userLogin: { required: true, type: String },
    },
    content: { required: true, type: String },
    createdAt: { default: Date.now, required: true, type: Date },
    postId: { ref: "Post", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: false, versionKey: false },
);

export const CommentModel = model<CommentDoc>("Comment", commentSchema);
