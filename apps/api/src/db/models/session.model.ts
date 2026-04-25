import { model, Schema, type Types } from "mongoose";

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

const sessionSchema = new Schema<SessionDoc>(
  {
    deviceId: { required: true, type: String },
    expiresAt: { required: true, type: Date },
    ip: { required: true, type: String },
    lastActiveAt: { required: true, type: Date },
    title: { required: true, type: String },
    tokenJti: { required: true, type: String },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: false, versionKey: false },
);

sessionSchema.index({ deviceId: 1, userId: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<SessionDoc>("Session", sessionSchema);
