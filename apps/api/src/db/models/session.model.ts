import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, type Types } from "mongoose";

@Schema({ timestamps: false, versionKey: false })
export class Session {
  @Prop({ required: true, type: String })
  deviceId!: string;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ required: true, type: String })
  ip!: string;

  @Prop({ required: true, type: Date })
  lastActiveAt!: Date;

  @Prop({ required: true, type: String })
  title!: string;

  @Prop({ required: true, type: String })
  tokenJti!: string;

  @Prop({ ref: "User", required: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;
}

export interface SessionDoc {
  _id: Types.ObjectId;
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: Types.ObjectId;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ deviceId: 1, userId: 1 }, { unique: true });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
