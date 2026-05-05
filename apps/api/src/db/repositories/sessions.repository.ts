import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { Session, type SessionDoc } from "../models/session.model.js";

export type SessionCreateInput = {
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: string;
};

@Injectable()
export class SessionsRepository {
  constructor(@InjectModel(Session.name) private readonly sessionModel: Model<Session>) {}

  async clearAll(): Promise<void> {
    await this.sessionModel.deleteMany({});
  }

  async create(input: SessionCreateInput): Promise<SessionDoc> {
    const doc = await this.sessionModel.create({
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

  async deleteAllByUserExceptDevice({
    currentDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    userId: string;
  }): Promise<void> {
    await this.sessionModel.deleteMany({
      deviceId: { $ne: currentDeviceId },
      userId: new Types.ObjectId(userId),
    });
  }

  async deleteByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: string;
  }): Promise<boolean> {
    const result = await this.sessionModel.deleteOne({
      deviceId,
      userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  }

  async findAllByUser(userId: string): Promise<SessionDoc[]> {
    return this.sessionModel.find({ userId: new Types.ObjectId(userId) }).lean();
  }

  async findByDeviceId(deviceId: string): Promise<null | SessionDoc> {
    return this.sessionModel.findOne({ deviceId }).lean();
  }

  async findByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: string;
  }): Promise<null | SessionDoc> {
    return this.sessionModel
      .findOne({
        deviceId,
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }

  async rotateSession({
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
    await this.sessionModel.updateOne(
      { deviceId, userId: new Types.ObjectId(userId) },
      { expiresAt, ip, lastActiveAt, tokenJti },
    );
  }
}
