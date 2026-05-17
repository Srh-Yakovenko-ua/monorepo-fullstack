import type { VideoResolution } from "@app/shared";

import { VIDEO_RESOLUTIONS } from "@app/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { z } from "zod";

import { type VideoDoc, VideoEntity } from "../domain/video.entity.js";

export type VideoCreateInput = Omit<VideoDoc, "createdAt" | "id"> & { createdAt?: Date };

export type VideoUpdateInput = Omit<VideoDoc, "createdAt" | "id">;

const availableResolutionsSchema = z.array(z.enum(VIDEO_RESOLUTIONS));

function mapEntity(entity: VideoEntity): VideoDoc {
  return {
    author: entity.author,
    availableResolutions: parseResolutions(entity.availableResolutions),
    canBeDownloaded: entity.canBeDownloaded,
    createdAt: entity.createdAt,
    id: entity.id,
    minAgeRestriction: entity.minAgeRestriction,
    publicationDate: entity.publicationDate,
    title: entity.title,
  };
}

@Injectable()
export class VideosRepository {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly repository: Repository<VideoEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: VideoCreateInput): Promise<VideoDoc> {
    const created = this.repository.create({
      author: input.author,
      availableResolutions: input.availableResolutions,
      canBeDownloaded: input.canBeDownloaded,
      createdAt: input.createdAt ?? new Date(),
      minAgeRestriction: input.minAgeRestriction,
      publicationDate: input.publicationDate,
      title: input.title,
    });
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async findAll(): Promise<VideoDoc[]> {
    const entities = await this.repository.find();
    return entities.map(mapEntity);
  }

  async findById(id: number): Promise<null | VideoDoc> {
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async update(id: number, patch: VideoUpdateInput): Promise<null | VideoDoc> {
    await this.repository.update(
      { id },
      {
        author: patch.author,
        availableResolutions: patch.availableResolutions,
        canBeDownloaded: patch.canBeDownloaded,
        minAgeRestriction: patch.minAgeRestriction,
        publicationDate: patch.publicationDate,
        title: patch.title,
      },
    );
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }
}

function parseResolutions(raw: string[] | VideoResolution[]): VideoResolution[] {
  return availableResolutionsSchema.parse(raw);
}
