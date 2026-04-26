import type { Types } from "mongoose";

import { USER_ROLES, type UserRole } from "@app/shared";
import { model, Schema } from "mongoose";

export interface EmailConfirmation {
  code: null | string;
  expiresAt: Date | null;
  isConfirmed: boolean;
}

export interface PasswordRecovery {
  code: null | string;
  expiresAt: Date | null;
}

export interface UserDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  email: string;
  emailConfirmation: EmailConfirmation;
  login: string;
  passwordHash: string;
  passwordRecovery: PasswordRecovery;
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

const passwordRecoverySchema = new Schema<PasswordRecovery>(
  {
    code: { default: null, type: String },
    expiresAt: { default: null, type: Date },
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
    passwordRecovery: {
      default: () => ({ code: null, expiresAt: null }),
      required: true,
      type: passwordRecoverySchema,
    },
    role: { default: "user", enum: USER_ROLES, required: true, type: String },
  },
  { timestamps: false, versionKey: false },
);

userSchema.index({ "passwordRecovery.code": 1 }, { sparse: true });
userSchema.index({ "emailConfirmation.code": 1 }, { sparse: true });

export const UserModel = model<UserDoc>("User", userSchema);
