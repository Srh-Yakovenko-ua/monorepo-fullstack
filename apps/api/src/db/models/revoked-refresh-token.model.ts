import { model, Schema, type Types } from "mongoose";

export interface RevokedRefreshTokenDoc {
  _id: Types.ObjectId;
  expiresAt: Date;
  jti: string;
}

const revokedRefreshTokenSchema = new Schema<RevokedRefreshTokenDoc>({
  expiresAt: { required: true, type: Date },
  jti: { required: true, type: String, unique: true },
});

revokedRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedRefreshTokenModel = model<RevokedRefreshTokenDoc>(
  "RevokedRefreshToken",
  revokedRefreshTokenSchema,
);
