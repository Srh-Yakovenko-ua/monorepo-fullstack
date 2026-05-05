import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model } from "mongoose";

import { Video, type VideoDoc } from "../domain/video.entity.js";

export type VideoCreateInput = Omit<VideoDoc, "createdAt"> & { createdAt?: Date };
export type VideoUpdateInput = Omit<VideoDoc, "_id" | "createdAt">;

@Injectable()
export class VideosRepository {
  constructor(@InjectModel(Video.name) private readonly videoModel: Model<Video>) {}

  async clearAll(): Promise<void> {
    await this.videoModel.deleteMany({});
  }

  async create(input: VideoCreateInput): Promise<VideoDoc> {
    const doc = await this.videoModel.create(input);
    return doc.toObject();
  }

  async findAll(): Promise<VideoDoc[]> {
    return this.videoModel.find({}).lean();
  }

  async findById(id: number): Promise<null | VideoDoc> {
    return this.videoModel.findById(id).lean();
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.videoModel.findByIdAndDelete(id);
    return result !== null;
  }

  async update(id: number, patch: VideoUpdateInput): Promise<null | VideoDoc> {
    return this.videoModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
  }
}
