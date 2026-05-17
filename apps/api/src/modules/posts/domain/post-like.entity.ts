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
import { PostEntity } from "./post.entity.js";

export type PostLikeStatus = PersistedLikeStatus;

@Entity({ name: "post_likes" })
@Index("post_likes_post_id_status_idx", ["postId", "status"])
@Unique(["postId", "userId"])
export class PostLikeEntity {
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @JoinColumn({ name: "post_id" })
  @ManyToOne(() => PostEntity, { onDelete: "CASCADE" })
  post!: PostEntity;

  @Column({ type: "integer" })
  postId!: number;

  @Column({ enum: PERSISTED_LIKE_STATUSES, type: "enum" })
  status!: PostLikeStatus;

  @JoinColumn({ name: "user_id" })
  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  user!: UserEntity;

  @Column({ type: "integer" })
  userId!: number;

  @Column({ type: "text" })
  userLogin!: string;
}
