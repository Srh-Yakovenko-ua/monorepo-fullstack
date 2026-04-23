import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { CommentModel } from "../db/models/comment.model.js";

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
  const res = await request(app).post("/api/users").auth("admin", "qwerty").send(user);
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
  const blogRes = await request(app)
    .post("/api/blogs")
    .send({ description: "Desc", name: "Blog", websiteUrl: "https://blog.example.com" });
  const postRes = await request(app).post("/api/posts").send({
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
