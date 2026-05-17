import { PERSISTED_LIKE_STATUSES, type PersistedLikeStatus } from "@app/shared";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { UserEntity } from "../../user-accounts/users/domain/user.entity.js";
import { CommentEntity } from "./comment.entity.js";

export type CommentLikeStatus = PersistedLikeStatus;

@Entity({ name: "comment_likes" })
@Index("comment_likes_comment_id_status_idx", ["commentId", "status"])
@Unique(["commentId", "userId"])
export class CommentLikeEntity {
  @JoinColumn({ name: "comment_id" })
  @ManyToOne(() => CommentEntity, { onDelete: "CASCADE" })
  comment!: CommentEntity;

  @Column({ type: "integer" })
  commentId!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ enum: PERSISTED_LIKE_STATUSES, type: "enum" })
  status!: CommentLikeStatus;

  @JoinColumn({ name: "user_id" })
  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  user!: UserEntity;

  @Column({ type: "integer" })
  userId!: number;
}
