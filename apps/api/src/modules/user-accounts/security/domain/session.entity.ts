import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { UserEntity } from "../../users/domain/user.entity.js";

export interface SessionDoc {
  deviceId: string;
  expiresAt: Date;
  id: number;
  ip: string;
  lastActiveAt: Date;
  title: string;
  tokenJti: string;
  userId: number;
}

@Entity({ name: "sessions" })
@Unique(["deviceId", "userId"])
export class SessionEntity {
  @Column({ type: "text" })
  deviceId!: string;

  @Column({ type: "timestamptz" })
  @Index("sessions_expires_at_idx")
  expiresAt!: Date;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ type: "text" })
  ip!: string;

  @Column({ type: "timestamptz" })
  lastActiveAt!: Date;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  tokenJti!: string;

  @JoinColumn({ name: "user_id" })
  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  user!: UserEntity;

  @Column({ type: "integer" })
  @Index("sessions_user_id_idx")
  userId!: number;
}
