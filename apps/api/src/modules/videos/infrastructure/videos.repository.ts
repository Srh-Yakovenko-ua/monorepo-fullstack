import type { VideoResolution } from "@app/shared";

import { VIDEO_RESOLUTIONS } from "@app/shared";
import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { z } from "zod";

import { POSTGRES_POOL } from "../../../core/database/postgres-pool.token.js";
import { type VideoDoc } from "../domain/video.entity.js";

export type VideoCreateInput = Omit<VideoDoc, "createdAt" | "id"> & { createdAt?: Date };

export type VideoUpdateInput = Omit<VideoDoc, "createdAt" | "id">;
interface VideoRow {
  author: string;
  available_resolutions: string[];
  can_be_downloaded: boolean;
  created_at: Date;
  id: number;
  min_age_restriction: null | number;
  publication_date: Date;
  title: string;
}

const availableResolutionsSchema = z.array(z.enum(VIDEO_RESOLUTIONS));

function mapRow(row: VideoRow): VideoDoc {
  return {
    author: row.author,
    availableResolutions: parseResolutions(row.available_resolutions),
    canBeDownloaded: row.can_be_downloaded,
    createdAt: row.created_at,
    id: row.id,
    minAgeRestriction: row.min_age_restriction,
    publicationDate: row.publication_date,
    title: row.title,
  };
}

@Injectable()
export class VideosRepository {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async clearAll(): Promise<void> {
    await this.pool.query("DELETE FROM videos");
  }

  async create(input: VideoCreateInput): Promise<VideoDoc> {
    const createdAt = input.createdAt ?? new Date();
    const result = await this.pool.query<VideoRow>(
      `INSERT INTO videos (title, author, available_resolutions, can_be_downloaded, min_age_restriction, created_at, publication_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.title,
        input.author,
        input.availableResolutions,
        input.canBeDownloaded,
        input.minAgeRestriction,
        createdAt,
        input.publicationDate,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("INSERT INTO videos did not return a row");
    return mapRow(row);
  }

  async findAll(): Promise<VideoDoc[]> {
    const result = await this.pool.query<VideoRow>("SELECT * FROM videos");
    return result.rows.map((row) => mapRow(row));
  }

  async findById(id: number): Promise<null | VideoDoc> {
    const result = await this.pool.query<VideoRow>("SELECT * FROM videos WHERE id = $1", [id]);
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM videos WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async update(id: number, patch: VideoUpdateInput): Promise<null | VideoDoc> {
    const result = await this.pool.query<VideoRow>(
      `UPDATE videos
       SET title = $1, author = $2, available_resolutions = $3, can_be_downloaded = $4, min_age_restriction = $5, publication_date = $6
       WHERE id = $7
       RETURNING *`,
      [
        patch.title,
        patch.author,
        patch.availableResolutions,
        patch.canBeDownloaded,
        patch.minAgeRestriction,
        patch.publicationDate,
        id,
      ],
    );
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }
}

function parseResolutions(raw: string[]): VideoResolution[] {
  return availableResolutionsSchema.parse(raw);
}
