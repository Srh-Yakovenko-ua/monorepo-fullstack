import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { PostLikeModel } from "../db/models/post-like.model.js";
import { PostModel } from "../db/models/post.model.js";
import { NotFoundError } from "../lib/errors.js";
import * as postsService from "./posts.service.js";

async function getLikeDoc({ postId, userId }: { postId: string; userId: string }) {
  return PostLikeModel.findOne({
    postId: new mongoose.Types.ObjectId(postId),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
}

async function getPostDoc(postId: string) {
  const fresh = await PostModel.findOne({ _id: postId }).lean();
  if (!fresh) throw new Error("Post vanished mid-test");
  return fresh;
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

describe("postsService.setLikeStatus", () => {
  it("throws NotFoundError when postId is malformed", async () => {
    const currentUserId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      postsService.setLikeStatus({
        currentUserId,
        currentUserLogin: "user",
        newStatus: "Like",
        postId: "not-a-valid-id",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when post does not exist", async () => {
    const currentUserId = new mongoose.Types.ObjectId().toHexString();
    const missingPostId = new mongoose.Types.ObjectId().toHexString();

    await expect(
      postsService.setLikeStatus({
        currentUserId,
        currentUserLogin: "user",
        newStatus: "Like",
        postId: missingPostId,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("None on a post with no record is idempotent — counters stay at 0", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "user",
      newStatus: "None",
      postId,
    });

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(0);
    const like = await getLikeDoc({ postId, userId });
    expect(like).toBeNull();
  });

  it("None to Like increments likesCount and creates a Like row with userLogin", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(1);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ postId, userId });
    expect(like?.status).toBe("Like");
    expect(like?.userLogin).toBe("alice");
  });

  it("Like to Like is idempotent — counters and like row timestamp do not change", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });
    const before = await getLikeDoc({ postId, userId });
    const beforePost = await getPostDoc(postId);

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });

    const after = await getLikeDoc({ postId, userId });
    const afterPost = await getPostDoc(postId);

    expect(after?.createdAt.toISOString()).toBe(before?.createdAt.toISOString());
    expect(afterPost.likesCount).toBe(beforePost.likesCount);
    expect(afterPost.dislikesCount).toBe(beforePost.dislikesCount);
    expect(afterPost.likesCount).toBe(1);
  });

  it("Like to Dislike flips counters and updates the like row", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });
    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Dislike",
      postId,
    });

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(1);

    const like = await getLikeDoc({ postId, userId });
    expect(like?.status).toBe("Dislike");
  });

  it("Like to None decrements likesCount and removes the like row", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });
    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "None",
      postId,
    });

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ postId, userId });
    expect(like).toBeNull();
  });

  it("Dislike to None decrements dislikesCount and removes the like row", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Dislike",
      postId,
    });
    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "None",
      postId,
    });

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(0);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ postId, userId });
    expect(like).toBeNull();
  });

  it("five concurrent Like requests from one user keep likesCount at 1", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await Promise.all(
      Array.from({ length: 5 }, () =>
        postsService.setLikeStatus({
          currentUserId: userId,
          currentUserLogin: "alice",
          newStatus: "Like",
          postId,
        }),
      ),
    );

    const fresh = await getPostDoc(postId);
    expect(fresh.likesCount).toBe(1);
    expect(fresh.dislikesCount).toBe(0);

    const like = await getLikeDoc({ postId, userId });
    expect(like?.status).toBe("Like");
  });
});

describe("postsService.getPostById extendedLikesInfo resolution", () => {
  it("returns myStatus=None and empty newestLikes when no likes exist", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();

    const view = await postsService.getPostById({ postId });

    expect(view.extendedLikesInfo.myStatus).toBe("None");
    expect(view.extendedLikesInfo.likesCount).toBe(0);
    expect(view.extendedLikesInfo.dislikesCount).toBe(0);
    expect(view.extendedLikesInfo.newestLikes).toEqual([]);
  });

  it("returns myStatus=Like for the user who liked the post", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId,
    });

    const view = await postsService.getPostById({ currentUserId: userId, postId });
    expect(view.extendedLikesInfo.myStatus).toBe("Like");
    expect(view.extendedLikesInfo.likesCount).toBe(1);
    expect(view.extendedLikesInfo.newestLikes).toHaveLength(1);
    expect(view.extendedLikesInfo.newestLikes[0]?.login).toBe("alice");
    expect(view.extendedLikesInfo.newestLikes[0]?.userId).toBe(userId);
  });

  it("returns at most 3 newestLikes sorted by addedAt desc", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();

    const baseTime = new Date("2026-01-01T00:00:00.000Z").valueOf();
    const seeds = Array.from({ length: 5 }, (_, index) => ({
      addedAt: new Date(baseTime + index * 1000),
      login: `user${index + 1}`,
      userId: new mongoose.Types.ObjectId(),
    }));

    for (const seed of seeds) {
      await PostLikeModel.create({
        createdAt: seed.addedAt,
        postId: new mongoose.Types.ObjectId(postId),
        status: "Like",
        userId: seed.userId,
        userLogin: seed.login,
      });
    }
    await PostModel.updateOne(
      { _id: new mongoose.Types.ObjectId(postId) },
      { $set: { likesCount: seeds.length } },
    );

    const view = await postsService.getPostById({ postId });
    expect(view.extendedLikesInfo.likesCount).toBe(5);
    expect(view.extendedLikesInfo.newestLikes).toHaveLength(3);
    const orderedLogins = view.extendedLikesInfo.newestLikes.map((like) => like.login);
    expect(orderedLogins).toEqual(["user5", "user4", "user3"]);
  });

  it("dislikes are not included in newestLikes", async () => {
    const post = await seedPost();
    const postId = post._id.toHexString();
    const liker = new mongoose.Types.ObjectId().toHexString();
    const disliker = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: liker,
      currentUserLogin: "liker",
      newStatus: "Like",
      postId,
    });
    await postsService.setLikeStatus({
      currentUserId: disliker,
      currentUserLogin: "disliker",
      newStatus: "Dislike",
      postId,
    });

    const view = await postsService.getPostById({ postId });
    expect(view.extendedLikesInfo.likesCount).toBe(1);
    expect(view.extendedLikesInfo.dislikesCount).toBe(1);
    expect(view.extendedLikesInfo.newestLikes).toHaveLength(1);
    expect(view.extendedLikesInfo.newestLikes[0]?.login).toBe("liker");
  });
});

describe("postsService.getAllPosts extendedLikesInfo resolution", () => {
  it("resolves per-post myStatus and newestLikes for the requesting user", async () => {
    const liked = await seedPost();
    const disliked = await seedPost();
    const untouched = await seedPost();
    const userId = new mongoose.Types.ObjectId().toHexString();

    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId: liked._id.toHexString(),
    });
    await postsService.setLikeStatus({
      currentUserId: userId,
      currentUserLogin: "alice",
      newStatus: "Dislike",
      postId: disliked._id.toHexString(),
    });

    const page = await postsService.getAllPosts({
      currentUserId: userId,
      query: { pageNumber: 1, pageSize: 10, sortBy: "createdAt", sortDirection: "desc" },
    });

    const byId = new Map(page.items.map((item) => [item.id, item.extendedLikesInfo] as const));
    expect(byId.get(liked._id.toHexString())?.myStatus).toBe("Like");
    expect(byId.get(disliked._id.toHexString())?.myStatus).toBe("Dislike");
    expect(byId.get(untouched._id.toHexString())?.myStatus).toBe("None");
    expect(byId.get(liked._id.toHexString())?.newestLikes).toHaveLength(1);
    expect(byId.get(untouched._id.toHexString())?.newestLikes).toEqual([]);
  });
});
