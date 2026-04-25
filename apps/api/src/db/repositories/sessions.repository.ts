import { Types } from "mongoose";

import { type SessionDoc, SessionModel } from "../models/session.model.js";

export type SessionCreateInput = {
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: string;
};

export async function clearAll(): Promise<void> {
  await SessionModel.deleteMany({});
}

export async function create(input: SessionCreateInput): Promise<SessionDoc> {
  const doc = await SessionModel.create({
    deviceId: input.deviceId,
    expiresAt: input.expiresAt,
    ip: input.ip,
    lastActiveAt: input.lastActiveAt,
    title: input.title,
    tokenJti: input.tokenJti,
    userId: new Types.ObjectId(input.userId),
  });
  return doc.toObject();
}

export async function deleteAllByUserExceptDevice({
  currentDeviceId,
  userId,
}: {
  currentDeviceId: string;
  userId: string;
}): Promise<void> {
  await SessionModel.deleteMany({
    deviceId: { $ne: currentDeviceId },
    userId: new Types.ObjectId(userId),
  });
}

export async function deleteByUserAndDevice({
  deviceId,
  userId,
}: {
  deviceId: string;
  userId: string;
}): Promise<boolean> {
  const result = await SessionModel.deleteOne({
    deviceId,
    userId: new Types.ObjectId(userId),
  });
  return result.deletedCount > 0;
}

export async function findAllByUser(userId: string): Promise<SessionDoc[]> {
  return SessionModel.find({ userId: new Types.ObjectId(userId) }).lean();
}

export async function findByDeviceId(deviceId: string): Promise<null | SessionDoc> {
  return SessionModel.findOne({ deviceId }).lean();
}

export async function findByUserAndDevice({
  deviceId,
  userId,
}: {
  deviceId: string;
  userId: string;
}): Promise<null | SessionDoc> {
  return SessionModel.findOne({
    deviceId,
    userId: new Types.ObjectId(userId),
  }).lean();
}

export async function rotateSession({
  deviceId,
  expiresAt,
  ip,
  lastActiveAt,
  tokenJti,
  userId,
}: {
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  tokenJti: string;
  userId: string;
}): Promise<void> {
  await SessionModel.updateOne(
    { deviceId, userId: new Types.ObjectId(userId) },
    { expiresAt, ip, lastActiveAt, tokenJti },
  );
}
