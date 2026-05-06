import type { PaginationQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { Post, type PostDoc } from "../domain/post.entity.js";

export type PostCreateInput = Pick<
  PostDoc,
  "blogId" | "blogName" | "content" | "shortDescription" | "title"
>;
export type PostFindPageQuery = PaginationQuery & { blogId?: string };
export type PostUpdateInput = PostCreateInput;

@Injectable()
export class PostsRepository {
  constructor(@InjectModel(Post.name) private readonly postModel: Model<Post>) {}

  async applyCounterDelta({
    dislikesDelta,
    likesDelta,
    postId,
  }: {
    dislikesDelta: number;
    likesDelta: number;
    postId: string;
  }): Promise<void> {
    if (likesDelta === 0 && dislikesDelta === 0) return;
    await this.postModel.updateOne(
      { _id: new Types.ObjectId(postId) },
      { $inc: { dislikesCount: dislikesDelta, likesCount: likesDelta } },
    );
  }

  async backfillMissingLikeCounters(): Promise<number> {
    const result = await this.postModel.updateMany(
      {
        $or: [{ dislikesCount: { $exists: false } }, { likesCount: { $exists: false } }],
      },
      [
        {
          $set: {
            dislikesCount: { $ifNull: ["$dislikesCount", 0] },
            likesCount: { $ifNull: ["$likesCount", 0] },
          },
        },
      ],
      { updatePipeline: true },
    );
    return result.modifiedCount;
  }

  async clearAll(): Promise<void> {
    await this.postModel.deleteMany({});
  }

  async create(input: PostCreateInput): Promise<PostDoc> {
    const doc = await this.postModel.create(input);
    return doc.toObject();
  }

  async findById(id: string): Promise<null | PostDoc> {
    return this.postModel.findById(id).lean();
  }

  async findPage(query: PostFindPageQuery): Promise<{ items: PostDoc[]; totalCount: number }> {
    const filter = query.blogId ? { blogId: query.blogId } : {};
    const skip = (query.pageNumber - 1) * query.pageSize;
    const sortOrder = query.sortDirection === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ [query.sortBy]: sortOrder })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      this.postModel.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.postModel.findByIdAndDelete(id);
    return result !== null;
  }

  async update(id: string, patch: PostUpdateInput): Promise<null | PostDoc> {
    return this.postModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
  }
}
