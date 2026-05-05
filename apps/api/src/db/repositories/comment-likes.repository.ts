import type { LikeStatus } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import { CommentLike, type CommentLikeStatus } from "../models/comment-like.model.js";

@Injectable()
export class CommentLikesRepository {
  constructor(
    @InjectModel(CommentLike.name) private readonly commentLikeModel: Model<CommentLike>,
  ) {}

  async clearAll(): Promise<void> {
    await this.commentLikeModel.deleteMany({});
  }

  async deleteAndReturnPreviousStatus({
    commentId,
    userId,
  }: {
    commentId: string;
    userId: string;
  }): Promise<CommentLikeStatus | null> {
    const previous = await this.commentLikeModel
      .findOneAndDelete({
        commentId: new Types.ObjectId(commentId),
        userId: new Types.ObjectId(userId),
      })
      .lean();
    return previous?.status ?? null;
  }

  async findByCommentIdsForUser({
    commentIds,
    userId,
  }: {
    commentIds: string[];
    userId: string;
  }): Promise<Map<string, LikeStatus>> {
    if (commentIds.length === 0) return new Map();
    const docs = await this.commentLikeModel
      .find({
        commentId: { $in: commentIds.map((commentId) => new Types.ObjectId(commentId)) },
        userId: new Types.ObjectId(userId),
      })
      .lean();
    const result = new Map<string, LikeStatus>();
    for (const doc of docs) {
      result.set(doc.commentId.toHexString(), doc.status);
    }
    return result;
  }

  async findOne({
    commentId,
    userId,
  }: {
    commentId: string;
    userId: string;
  }): Promise<CommentLikeStatus | null> {
    const doc = await this.commentLikeModel
      .findOne({
        commentId: new Types.ObjectId(commentId),
        userId: new Types.ObjectId(userId),
      })
      .lean();
    return doc?.status ?? null;
  }

  async upsertAndReturnPreviousStatus({
    commentId,
    status,
    userId,
  }: {
    commentId: string;
    status: CommentLikeStatus;
    userId: string;
  }): Promise<CommentLikeStatus | null> {
    const previous = await this.commentLikeModel
      .findOneAndUpdate(
        {
          commentId: new Types.ObjectId(commentId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: { status },
          $setOnInsert: {
            commentId: new Types.ObjectId(commentId),
            createdAt: new Date(),
            userId: new Types.ObjectId(userId),
          },
        },
        { returnDocument: "before", upsert: true },
      )
      .lean();
    return previous?.status ?? null;
  }
}
