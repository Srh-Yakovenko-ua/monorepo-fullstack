import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { CommentModel } from "../db/models/comment.model.js";
import { createAdminAndLogin } from "../test/auth-helpers.js";

const app = createApp();

const validUser = {
  email: "owner@example.dev",
  login: "owner",
  password: "password1",
};

const otherUser = {
  email: "other@example.dev",
  login: "other",
  password: "password2",
};

async function createUserViaApi(user: typeof validUser) {
  const adminToken = await createAdminAndLogin(app);
  const res = await request(app)
    .post("/api/users")
    .set("authorization", `Bearer ${adminToken}`)
    .send(user);
  return res.body as { createdAt: string; email: string; id: string; login: string };
}

async function loginAs({ loginOrEmail, password }: { loginOrEmail: string; password: string }) {
  const res = await request(app).post("/api/auth/login").send({ loginOrEmail, password });
  return res.body.accessToken as string;
}

async function seedComment({
  postId,
  userId,
  userLogin,
}: {
  postId: string;
  userId: string;
  userLogin: string;
}) {
  const doc = await CommentModel.create({
    commentatorInfo: {
      userId: new mongoose.Types.ObjectId(userId),
      userLogin,
    },
    content: "This is a seeded comment body",
    postId: new mongoose.Types.ObjectId(postId),
  });
  return doc.toObject();
}

async function seedPost() {
  const adminToken = await createAdminAndLogin(app);
  const blogRes = await request(app)
    .post("/api/blogs")
    .set("authorization", `Bearer ${adminToken}`)
    .send({ description: "Desc", name: "Blog", websiteUrl: "https://blog.example.com" });
  const postRes = await request(app)
    .post("/api/posts")
    .set("authorization", `Bearer ${adminToken}`)
    .send({
      blogId: blogRes.body.id,
      content: "Post content here",
      shortDescription: "Short",
      title: "Post Title",
    });
  return postRes.body as { id: string };
}

describe("Comments API", () => {
  describe("GET /api/comments/:commentId", () => {
    it("returns 200 with CommentViewModel shape for an existing comment", async () => {
      const ownerData = await createUserViaApi(validUser);
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app).get(`/api/comments/${commentId}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.id).toBe("string");
      expect(typeof res.body.content).toBe("string");
      expect(typeof res.body.createdAt).toBe("string");
      expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
      expect(typeof res.body.commentatorInfo.userId).toBe("string");
      expect(typeof res.body.commentatorInfo.userLogin).toBe("string");
    });

    it("returns 404 empty body for a valid-format but nonexistent commentId", async () => {
      const res = await request(app).get("/api/comments/507f1f77bcf86cd799439011");

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body for a malformed commentId", async () => {
      const res = await request(app).get("/api/comments/not-a-valid-id");

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });
  });

  describe("PUT /api/comments/:commentId", () => {
    it("returns 204 when owner updates with valid content", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "Updated content that is long enough here" });

      expect(res.status).toBe(204);
    });

    it("persists updated content in DB after 204", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();
      const newContent = "Freshly updated content for verification";

      await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: newContent });

      const updated = await CommentModel.findOne({ _id: commentId }).lean();
      expect(updated?.content).toBe(newContent);
    });

    it("returns 400 with errorsMessages on field content when content is too short", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "too short" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "content" })]),
      );
    });

    it("returns 400 with errorsMessages on field content when content is too long", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "a".repeat(301) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "content" })]),
      );
    });

    it("returns 401 empty body when no token is sent", async () => {
      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011")
        .send({ content: "Valid content that is long enough here" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 empty body when token is invalid", async () => {
      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011")
        .set("authorization", "Bearer garbage.token.value")
        .send({ content: "Valid content that is long enough here" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 403 empty body when a different user tries to update", async () => {
      const ownerData = await createUserViaApi(validUser);
      await createUserViaApi(otherUser);
      const otherToken = await loginAs({
        loginOrEmail: otherUser.login,
        password: otherUser.password,
      });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${otherToken}`)
        .send({ content: "Trying to overwrite someone else content" });

      expect(res.status).toBe(403);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is a valid ObjectId that does not exist", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011")
        .set("authorization", `Bearer ${token}`)
        .send({ content: "Valid content that is long enough here" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is malformed", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .put("/api/comments/not-a-valid-id")
        .set("authorization", `Bearer ${token}`)
        .send({ content: "Valid content that is long enough here" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });
  });

  describe("PUT /api/comments/:commentId/like-status", () => {
    it("returns 401 empty body when no token is sent", async () => {
      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011/like-status")
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 empty body when token is garbage", async () => {
      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011/like-status")
        .set("authorization", "Bearer garbage.token.value")
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is malformed", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .put("/api/comments/not-a-valid-id/like-status")
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is a valid ObjectId that does not exist", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .put("/api/comments/507f1f77bcf86cd799439011/like-status")
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 400 with errorsMessages on field likeStatus when body is empty", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
      );
    });

    it("returns 400 with errorsMessages on field likeStatus when value is not in the enum", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Loved" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
      );
    });

    it("returns 204 on a valid Like body", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
    });

    it("a repeated Like is idempotent — counters stay at 1", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      const second = await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(second.status).toBe(204);

      const res = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);

      expect(res.body.likesInfo.likesCount).toBe(1);
      expect(res.body.likesInfo.dislikesCount).toBe(0);
      expect(res.body.likesInfo.myStatus).toBe("Like");
    });

    it("Like → Dislike → None updates counters and myStatus at every step", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      const afterLike = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterLike.body.likesInfo).toMatchObject({
        dislikesCount: 0,
        likesCount: 1,
        myStatus: "Like",
      });

      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Dislike" });
      const afterDislike = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterDislike.body.likesInfo).toMatchObject({
        dislikesCount: 1,
        likesCount: 0,
        myStatus: "Dislike",
      });

      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "None" });
      const afterNone = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterNone.body.likesInfo).toMatchObject({
        dislikesCount: 0,
        likesCount: 0,
        myStatus: "None",
      });
    });

    it("multi-user — A likes, B dislikes — counters reflect both, myStatus is per-viewer", async () => {
      const ownerData = await createUserViaApi(validUser);
      await createUserViaApi(otherUser);
      const tokenA = await loginAs({
        loginOrEmail: validUser.login,
        password: validUser.password,
      });
      const tokenB = await loginAs({
        loginOrEmail: otherUser.login,
        password: otherUser.password,
      });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${tokenA}`)
        .send({ likeStatus: "Like" });
      await request(app)
        .put(`/api/comments/${commentId}/like-status`)
        .set("authorization", `Bearer ${tokenB}`)
        .send({ likeStatus: "Dislike" });

      const asA = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${tokenA}`);
      const asB = await request(app)
        .get(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${tokenB}`);
      const anon = await request(app).get(`/api/comments/${commentId}`);

      expect(asA.body.likesInfo).toMatchObject({
        dislikesCount: 1,
        likesCount: 1,
        myStatus: "Like",
      });
      expect(asB.body.likesInfo).toMatchObject({
        dislikesCount: 1,
        likesCount: 1,
        myStatus: "Dislike",
      });
      expect(anon.body.likesInfo).toMatchObject({
        dislikesCount: 1,
        likesCount: 1,
        myStatus: "None",
      });
    });
  });

  describe("GET /api/posts/:postId/comments — myStatus per item", () => {
    it("returns myStatus=None on every item when called anonymously", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const a = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const b = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });

      await request(app)
        .put(`/api/comments/${a._id.toHexString()}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      await request(app)
        .put(`/api/comments/${b._id.toHexString()}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Dislike" });

      const res = await request(app).get(`/api/posts/${post.id}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      for (const item of res.body.items) {
        expect(item.likesInfo.myStatus).toBe("None");
      }
    });

    it("returns per-item myStatus matching the authenticated viewer", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const liked = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const disliked = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const untouched = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });

      await request(app)
        .put(`/api/comments/${liked._id.toHexString()}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      await request(app)
        .put(`/api/comments/${disliked._id.toHexString()}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Dislike" });

      const res = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const byId = new Map(
        (res.body.items as { id: string; likesInfo: { myStatus: string } }[]).map(
          (item) => [item.id, item.likesInfo.myStatus] as const,
        ),
      );
      expect(byId.get(liked._id.toHexString())).toBe("Like");
      expect(byId.get(disliked._id.toHexString())).toBe("Dislike");
      expect(byId.get(untouched._id.toHexString())).toBe("None");
    });
  });

  describe("DELETE /api/comments/:commentId", () => {
    it("returns 204 when owner deletes their comment", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it("comment is removed from DB after 204", async () => {
      const ownerData = await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${token}`);

      const remaining = await CommentModel.countDocuments({ _id: commentId });
      expect(remaining).toBe(0);
    });

    it("returns 401 empty body when no token is sent", async () => {
      const res = await request(app).delete("/api/comments/507f1f77bcf86cd799439011");

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 403 empty body when a different user tries to delete", async () => {
      const ownerData = await createUserViaApi(validUser);
      await createUserViaApi(otherUser);
      const otherToken = await loginAs({
        loginOrEmail: otherUser.login,
        password: otherUser.password,
      });
      const post = await seedPost();
      const doc = await seedComment({
        postId: post.id,
        userId: ownerData.id,
        userLogin: ownerData.login,
      });
      const commentId = doc._id.toHexString();

      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set("authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is a valid ObjectId that does not exist", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .delete("/api/comments/507f1f77bcf86cd799439011")
        .set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when commentId is malformed", async () => {
      await createUserViaApi(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(app)
        .delete("/api/comments/not-a-valid-id")
        .set("authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });
  });
});
