import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { BlogEntity } from "../../blogs/domain/blog.entity.js";

export interface PostDoc {
  blogId: number;
  blogName: string;
  content: string;
  createdAt: Date;
  dislikesCount: number;
  id: number;
  likesCount: number;
  shortDescription: string;
  title: string;
}

@Entity({ name: "posts" })
export class PostEntity {
  @JoinColumn({ name: "blog_id" })
  @ManyToOne(() => BlogEntity, { onDelete: "CASCADE" })
  blog!: BlogEntity;

  @Column({ type: "integer" })
  @Index("posts_blog_id_idx")
  blogId!: number;

  @Column({ type: "text" })
  blogName!: string;

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

  @Column({ type: "text" })
  shortDescription!: string;

  @Column({ type: "text" })
  title!: string;
}
