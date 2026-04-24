import type { Types } from "mongoose";

import { USER_ROLES, type UserRole } from "@app/shared";
import { model, Schema } from "mongoose";

export interface EmailConfirmation {
  code: null | string;
  expiresAt: Date | null;
  isConfirmed: boolean;
}

export interface UserDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  email: string;
  emailConfirmation: EmailConfirmation;
  login: string;
  passwordHash: string;
  role: UserRole;
}

export type { UserRole };

const emailConfirmationSchema = new Schema<EmailConfirmation>(
  {
    code: { default: null, type: String },
    expiresAt: { default: null, type: Date },
    isConfirmed: { default: true, required: true, type: Boolean },
  },
  { _id: false, versionKey: false },
);

const userSchema = new Schema<UserDoc>(
  {
    createdAt: { default: Date.now, required: true, type: Date },
    email: { required: true, type: String, unique: true },
    emailConfirmation: {
      default: () => ({ code: null, expiresAt: null, isConfirmed: true }),
      required: true,
      type: emailConfirmationSchema,
    },
    login: { required: true, type: String, unique: true },
    passwordHash: { required: true, type: String },
    role: { default: "user", enum: USER_ROLES, required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

export const UserModel = model<UserDoc>("User", userSchema);
