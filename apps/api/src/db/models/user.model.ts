import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  email: string;
  login: string;
  passwordHash: string;
}

const userSchema = new Schema<UserDoc>(
  {
    createdAt: { default: Date.now, required: true, type: Date },
    email: { required: true, type: String, unique: true },
    login: { required: true, type: String, unique: true },
    passwordHash: { required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

export const UserModel = model<UserDoc>("User", userSchema);
