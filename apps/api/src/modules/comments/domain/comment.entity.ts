import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { PostEntity } from "../../posts/domain/post.entity.js";
import { UserEntity } from "../../user-accounts/users/domain/user.entity.js";

export interface CommentDoc {
  commentatorUserId: number;
  commentatorUserLogin: string;
  content: string;
  createdAt: Date;
  dislikesCount: number;
  id: number;
  likesCount: number;
  postId: number;
}

@Entity({ name: "comments" })
@Index("comments_post_id_created_at_idx", ["postId", "createdAt"])
export class CommentEntity {
  @JoinColumn({ name: "commentator_user_id" })
  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  commentatorUser!: UserEntity;

  @Column({ type: "integer" })
  commentatorUserId!: number;

  @Column({ type: "text" })
  commentatorUserLogin!: string;

  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ default: 0, type: "integer" })
  dislikesCount!: number;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ default: 0, type: "integer" })
  likesCount!: number;

  @JoinColumn({ name: "post_id" })
  @ManyToOne(() => PostEntity, { onDelete: "CASCADE" })
  post!: PostEntity;

  @Column({ type: "integer" })
  postId!: number;
}
