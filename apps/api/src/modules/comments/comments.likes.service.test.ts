import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { CommentLikeModel } from "../../db/models/comment-like.model.js";
import { CommentModel } from "../../db/models/comment.model.js";
import { PostModel } from "../../db/models/post.model.js";
import { NotFoundError } from "../../lib/errors.js";
import { CommentsService } from "./comments.service.js";

const commentsService = new CommentsService();

async function getCommentDoc(commentId: string) {
  const fresh = await CommentModel.findOne({ _id: commentId }).lean();
  if (!fresh) throw new Error("Comment vanished mid-test");
  return fresh;
}

async function getLikeDoc({ commentId, userId }: { commentId: string; userId: string }) {
  return CommentLikeModel.findOne({
    commentId: new mongoose.Types.ObjectId(commentId),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
}

async function seedComment({ postId, userId }: { postId: string; userId: string }) {
  const doc = await CommentModel.create({
    commentatorInfo: {
      userId: new mongoose.Types.ObjectId(userId),
      userLogin: "commenter",
    },
    content: "Seeded comment body for like tests",
    postId: new mongoose.Types.ObjectId(postId),
  });
  return doc.toObject();
}

async function seedPost() {
  const doc = await PostModel.create({
    blogId: new mongoose.Types.ObjectId().toHexString(),
    blogName: "Blog",
    content: "Post content here",
    shortDescription: "Short",
    title: "Post Title",
  });
  return doc.toObject();
}

describe("commentsService.setLikeStatus", () => {
  it("throws NotFoundError when commentId is malformed", async () => {
    const currentUserId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      commentsService.setLikeStatus({
        commentId: "not-a-valid-id",
        currentUserId,
        newStatus: "Like",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when comment does not exist", async () => {
    const currentUserId = new mongoose.Types.ObjectId().toHexString();
    const missingCommentId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      commentsService.setLikeStatus({
        commentId: missingCommentId,
        currentUserId,
        newStatus: "Like",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("None to Like increments likesCount and creates a Like row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(1);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ commentId, userId });
    expect(like?.status).toBe("Like");
  });

  it("None to Dislike increments dislikesCount and creates a Dislike row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Dislike" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(1);

    const like = await getLikeDoc({ commentId, userId });
    expect(like?.status).toBe("Dislike");
  });

  it("Like to Like is idempotent — counters and like row timestamp do not change", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });
    const before = await getLikeDoc({ commentId, userId });
    const beforeComment = await getCommentDoc(commentId);

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });

    const after = await getLikeDoc({ commentId, userId });
    const afterComment = await getCommentDoc(commentId);

    expect(after?.createdAt.toISOString()).toBe(before?.createdAt.toISOString());
    expect(afterComment.likesCount).toBe(beforeComment.likesCount);
    expect(afterComment.dislikesCount).toBe(beforeComment.dislikesCount);
    expect(afterComment.likesCount).toBe(1);
  });

  it("Like to None decrements likesCount and removes the like row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });
    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "None" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ commentId, userId });
    expect(like).toBeNull();
  });

  it("Like to Dislike flips counters and updates the like row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });
    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Dislike" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(1);

    const like = await getLikeDoc({ commentId, userId });
    expect(like?.status).toBe("Dislike");
  });

  it("Dislike to Like flips counters and updates the like row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Dislike" });
    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(1);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ commentId, userId });
    expect(like?.status).toBe("Like");
  });

  it("Dislike to None decrements dislikesCount and removes the like row", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Dislike" });
    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "None" });

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ commentId, userId });
    expect(like).toBeNull();
  });

  it("five concurrent Like requests from one user keep likesCount at 1", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await Promise.all(
      Array.from({ length: 5 }, () =>
        commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" }),
      ),
    );

    const fresh = await getCommentDoc(commentId);
    expect(fresh.likesCount).toBe(1);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ commentId, userId });
    expect(like?.status).toBe("Like");
  });
});

describe("commentsService.getCommentById myStatus resolution", () => {
  it("returns myStatus=None when no currentUserId is provided", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });

    const view = await commentsService.getCommentById({ commentId });
    expect(view.likesInfo.myStatus).toBe("None");
  });

  it("returns myStatus=None for a user who has not liked the comment", async () => {
    const post = await seedPost();
    const ownerId = new mongoose.Types.ObjectId().toHexString();
    const otherUserId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId: ownerId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: ownerId, newStatus: "Like" });

    const view = await commentsService.getCommentById({ commentId, currentUserId: otherUserId });
    expect(view.likesInfo.myStatus).toBe("None");
    expect(view.likesInfo.likesCount).toBe(1);
  });

  it("returns myStatus=Like for the user who liked the comment", async () => {
    const post = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const seeded = await seedComment({ postId: post._id.toHexString(), userId });
    const commentId = seeded._id.toHexString();

    await commentsService.setLikeStatus({ commentId, currentUserId: userId, newStatus: "Like" });

    const view = await commentsService.getCommentById({ commentId, currentUserId: userId });
    expect(view.likesInfo.myStatus).toBe("Like");
  });
});

describe("commentsService.listPostComments myStatus resolution", () => {
  it("returns myStatus=None on every item when called anonymously", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const a = await seedComment({ postId, userId });
    const b = await seedComment({ postId, userId });

    await commentsService.setLikeStatus({
      commentId: a._id.toHexString(),
      currentUserId: userId,
      newStatus: "Like",
    });
    await commentsService.setLikeStatus({
      commentId: b._id.toHexString(),
      currentUserId: userId,
      newStatus: "Dislike",
    });

    const page = await commentsService.listPostComments({
      postId,
      query: { pageNumber: 1, pageSize: 10, sortBy: "createdAt", sortDirection: "desc" },
    });

    expect(page.items).toHaveLength(2);
    for (const item of page.items) {
      expect(item.likesInfo.myStatus).toBe("None");
    }
  });

  it("returns per-item myStatus matching the requesting user's reactions", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();
    const liked = await seedComment({ postId, userId });
    const disliked = await seedComment({ postId, userId });
    const untouched = await seedComment({ postId, userId });

    await commentsService.setLikeStatus({
      commentId: liked._id.toHexString(),
      currentUserId: userId,
      newStatus: "Like",
    });
    await commentsService.setLikeStatus({
      commentId: disliked._id.toHexString(),
      currentUserId: userId,
      newStatus: "Dislike",
    });

    const page = await commentsService.listPostComments({
      currentUserId: userId,
      postId,
      query: { pageNumber: 1, pageSize: 10, sortBy: "createdAt", sortDirection: "desc" },
    });

    const byId = new Map(page.items.map((item) => [item.id, item.likesInfo.myStatus] as const));
    expect(byId.get(liked._id.toHexString())).toBe("Like");
    expect(byId.get(disliked._id.toHexString())).toBe("Dislike");
    expect(byId.get(untouched._id.toHexString())).toBe("None");
  });
});
