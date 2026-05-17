import { type VideoResolution } from "@app/shared";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface VideoDoc {
  author: string;
  availableResolutions: VideoResolution[];
  canBeDownloaded: boolean;
  createdAt: Date;
  id: number;
  minAgeRestriction: null | number;
  publicationDate: Date;
  title: string;
}

@Entity({ name: "videos" })
export class VideoEntity {
  @Column({ type: "text" })
  author!: string;

  @Column({ array: true, type: "text" })
  availableResolutions!: VideoResolution[];

  @Column({ default: false, type: "boolean" })
  canBeDownloaded!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @PrimaryGeneratedColumn("identity", { type: "integer" })
  id!: number;

  @Column({ nullable: true, type: "integer" })
  minAgeRestriction!: null | number;

  @Column({ type: "timestamptz" })
  publicationDate!: Date;

  @Column({ type: "text" })
  title!: string;
}
