import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";

import { type SessionDoc, SessionEntity } from "../domain/session.entity.js";

export type SessionCreateInput = {
  deviceId: string;
  expiresAt: Date;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: number;
};

function mapEntity(entity: SessionEntity): SessionDoc {
  return {
    deviceId: entity.deviceId,
    expiresAt: entity.expiresAt,
    id: entity.id,
    ip: entity.ip,
    lastActiveAt: entity.lastActiveAt,
    title: entity.title,
    tokenJti: entity.tokenJti,
    userId: entity.userId,
  };
}

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: SessionCreateInput): Promise<SessionDoc> {
    const created = this.repository.create(input);
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async deleteAllByUserExceptDevice({
    currentDeviceId,
    userId,
  }: {
    currentDeviceId: string;
    userId: number;
  }): Promise<void> {
    await this.repository.delete({ deviceId: Not(currentDeviceId), userId });
  }

  async deleteByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: number;
  }): Promise<boolean> {
    const result = await this.repository.delete({ deviceId, userId });
    return (result.affected ?? 0) > 0;
  }

  async findAllByUser(userId: number): Promise<SessionDoc[]> {
    const entities = await this.repository.findBy({ userId });
    return entities.map(mapEntity);
  }

  async findByDeviceId(deviceId: string): Promise<null | SessionDoc> {
    const found = await this.repository.findOneBy({ deviceId });
    return found ? mapEntity(found) : null;
  }

  async findByUserAndDevice({
    deviceId,
    userId,
  }: {
    deviceId: string;
    userId: number;
  }): Promise<null | SessionDoc> {
    const found = await this.repository.findOneBy({ deviceId, userId });
    return found ? mapEntity(found) : null;
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
    userId: number;
  }): Promise<void> {
    await this.repository.update({ deviceId, userId }, { expiresAt, ip, lastActiveAt, tokenJti });
  }
}
