import { USER_ROLES, type UserRole } from "@app/shared";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type Types } from "mongoose";

export interface EmailConfirmation {
  code: null | string;
  expiresAt: Date | null;
  isConfirmed: boolean;
}

export interface PasswordRecovery {
  code: null | string;
  expiresAt: Date | null;
}

export type { UserRole };

@Schema({ _id: false, versionKey: false })
export class EmailConfirmationSubdoc {
  @Prop({ default: null, type: String })
  code!: null | string;

  @Prop({ default: null, type: Date })
  expiresAt!: Date | null;

  @Prop({ default: true, required: true, type: Boolean })
  isConfirmed!: boolean;
}

const EmailConfirmationSchema = SchemaFactory.createForClass(EmailConfirmationSubdoc);

@Schema({ _id: false, versionKey: false })
export class PasswordRecoverySubdoc {
  @Prop({ default: null, type: String })
  code!: null | string;

  @Prop({ default: null, type: Date })
  expiresAt!: Date | null;
}

const PasswordRecoverySchema = SchemaFactory.createForClass(PasswordRecoverySubdoc);

@Schema({ timestamps: false, versionKey: false })
export class User {
  @Prop({ default: Date.now, required: true, type: Date })
  createdAt!: Date;

  @Prop({ required: true, type: String, unique: true })
  email!: string;

  @Prop({
    default: () => ({ code: null, expiresAt: null, isConfirmed: true }),
    required: true,
    type: EmailConfirmationSchema,
  })
  emailConfirmation!: EmailConfirmationSubdoc;

  @Prop({ required: true, type: String, unique: true })
  login!: string;

  @Prop({ required: true, type: String })
  passwordHash!: string;

  @Prop({
    default: () => ({ code: null, expiresAt: null }),
    required: true,
    type: PasswordRecoverySchema,
  })
  passwordRecovery!: PasswordRecoverySubdoc;

  @Prop({ default: "user", enum: USER_ROLES, required: true, type: String })
  role!: UserRole;
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

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ "passwordRecovery.code": 1 }, { sparse: true });
UserSchema.index({ "emailConfirmation.code": 1 }, { sparse: true });
