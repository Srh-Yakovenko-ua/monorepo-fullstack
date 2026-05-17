import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface BlogDoc {
  createdAt: Date;
  description: string;
  id: number;
  isMembership: boolean;
  name: string;
  websiteUrl: string;
}

@Entity({ name: "blogs" })
export class BlogEntity {
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "text" })
  description!: string;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ default: false, type: "boolean" })
  isMembership!: boolean;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  websiteUrl!: string;
}
