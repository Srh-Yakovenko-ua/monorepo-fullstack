import type { CommentsQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { Comment, type CommentDoc } from "../domain/comment.entity.js";

export type CommentCreateInput = Pick<CommentDoc, "commentatorInfo" | "content" | "postId">;

@Injectable()
export class CommentsRepository {
  constructor(@InjectModel(Comment.name) private readonly commentModel: Model<Comment>) {}

  async applyCounterDelta({
    commentId,
    dislikesDelta,
    likesDelta,
  }: {
    commentId: string;
    dislikesDelta: number;
    likesDelta: number;
  }): Promise<void> {
    if (likesDelta === 0 && dislikesDelta === 0) return;
    await this.commentModel.updateOne(
      { _id: new Types.ObjectId(commentId) },
      { $inc: { dislikesCount: dislikesDelta, likesCount: likesDelta } },
    );
  }

  async clearAll(): Promise<void> {
    await this.commentModel.deleteMany({});
  }

  async create(input: CommentCreateInput): Promise<CommentDoc> {
    const doc = await this.commentModel.create(input);
    return doc.toObject();
  }

  async findById(id: string): Promise<CommentDoc | null> {
    return this.commentModel.findById(id).lean();
  }

  async findByPostId(
    postId: string,
    query: CommentsQuery,
  ): Promise<{ items: CommentDoc[]; totalCount: number }> {
    const filter = { postId: new Types.ObjectId(postId) };
    const skip = (query.pageNumber - 1) * query.pageSize;
    const sortOrder = query.sortDirection === "asc" ? 1 : -1;
    const [items, totalCount] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ [query.sortBy]: sortOrder })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      this.commentModel.countDocuments(filter),
    ]);
    return { items, totalCount };
  }

  async remove(id: string): Promise<void> {
    await this.commentModel.findByIdAndDelete(id);
  }

  async updateContent(id: string, content: string): Promise<void> {
    await this.commentModel.findByIdAndUpdate(id, { content });
  }
}
