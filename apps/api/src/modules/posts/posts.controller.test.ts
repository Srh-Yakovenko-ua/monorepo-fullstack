import type { INestApplication } from "@nestjs/common";

import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CommentModel } from "../../db/models/comment.model.js";
import { PostLikeModel } from "../../db/models/post-like.model.js";
import { PostModel } from "../../db/models/post.model.js";
import { createAdminAndLogin } from "../../test/auth-helpers.js";
import { createTestApp } from "../../test/create-test-app.js";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  app = await createTestApp();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

const validBlogBody = {
  description: "Blog description",
  name: "My Blog",
  websiteUrl: "https://myblog.com",
};

const validUser = {
  email: "commenter@example.dev",
  login: "commenter",
  password: "password1",
};

const otherUser = {
  email: "other@example.dev",
  login: "other",
  password: "password2",
};

async function buildValidPost(blogId: string) {
  return {
    blogId,
    content: "Post content body",
    shortDescription: "Short desc",
    title: "Post Title",
  };
}

async function createBlog(): Promise<{ id: string; name: string }> {
  const res = await request(server).post("/api/blogs").send(validBlogBody);
  return res.body as { id: string; name: string };
}

async function createUserViaHelper(user: typeof validUser) {
  const adminToken = await createAdminAndLogin(app);
  const res = await request(server)
    .post("/api/users")
    .set("authorization", `Bearer ${adminToken}`)
    .send(user);
  return res.body as { id: string; login: string };
}

async function loginAs({ loginOrEmail, password }: { loginOrEmail: string; password: string }) {
  const res = await request(server).post("/api/auth/login").send({ loginOrEmail, password });
  return res.body.accessToken as string;
}

describe("Posts API", () => {
  describe("GET /api/posts", () => {
    it("returns empty paginator when no posts exist", async () => {
      const res = await request(server).get("/api/posts");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        pagesCount: 0,
        pageSize: 10,
        totalCount: 0,
      });
    });

    it("returns paginator with one item after creating one", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      await request(server).post("/api/posts").send(postBody);

      const res = await request(server).get("/api/posts");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.pagesCount).toBe(1);
    });

    it("respects pageNumber and pageSize", async () => {
      const blog = await createBlog();
      for (let i = 1; i <= 4; i++) {
        await request(server)
          .post("/api/posts")
          .send({ ...(await buildValidPost(blog.id)), title: `Post ${i}` });
      }

      const res = await request(server).get("/api/posts?pageNumber=2&pageSize=3");

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(3);
      expect(res.body.totalCount).toBe(4);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(1);
    });

    it("sorts by title asc", async () => {
      const blog = await createBlog();
      await request(server)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Zebra" });
      await request(server)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Apple" });

      const res = await request(server).get("/api/posts?sortBy=title&sortDirection=asc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe("Apple");
      expect(res.body.items[1].title).toBe("Zebra");
    });

    it("sorts by title desc", async () => {
      const blog = await createBlog();
      await request(server)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Zebra" });
      await request(server)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Apple" });

      const res = await request(server).get("/api/posts?sortBy=title&sortDirection=desc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe("Zebra");
      expect(res.body.items[1].title).toBe("Apple");
    });

    it("returns 400 for invalid sortBy field", async () => {
      const res = await request(server).get("/api/posts?sortBy=invalid");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/posts", () => {
    it("creates a post and returns 201 with blogName filled from the blog", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);

      const res = await request(server).post("/api/posts").send(postBody);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.title).toBe(postBody.title);
      expect(res.body.blogId).toBe(blog.id);
      expect(res.body.blogName).toBe(validBlogBody.name);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("returns 400 with blogId field error when blogId does not exist", async () => {
      const res = await request(server).post("/api/posts").send({
        blogId: "000000000000000000000000",
        content: "Content",
        shortDescription: "Short",
        title: "Title",
      });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "blogId", message: "blog not found" }),
        ]),
      );
    });

    it("returns 400 when title is missing", async () => {
      const blog = await createBlog();

      const res = await request(server).post("/api/posts").send({
        blogId: blog.id,
        content: "Content",
        shortDescription: "Short",
      });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 400 when title exceeds 30 characters", async () => {
      const blog = await createBlog();

      const res = await request(server)
        .post("/api/posts")
        .send({
          blogId: blog.id,
          content: "Content",
          shortDescription: "Short",
          title: "a".repeat(31),
        });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 400 when shortDescription exceeds 100 characters", async () => {
      const blog = await createBlog();

      const res = await request(server)
        .post("/api/posts")
        .send({
          blogId: blog.id,
          content: "Content",
          shortDescription: "a".repeat(101),
          title: "Title",
        });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "shortDescription" })]),
      );
    });

    it("returns 400 when content exceeds 1000 characters", async () => {
      const blog = await createBlog();

      const res = await request(server)
        .post("/api/posts")
        .send({
          blogId: blog.id,
          content: "a".repeat(1001),
          shortDescription: "Short",
          title: "Title",
        });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "content" })]),
      );
    });

    it("returns 400 when title is an empty string", async () => {
      const blog = await createBlog();

      const res = await request(server).post("/api/posts").send({
        blogId: blog.id,
        content: "Content",
        shortDescription: "Short",
        title: "   ",
      });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });
  });

  describe("GET /api/posts/:id", () => {
    it("returns the post by id", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(server).get(`/api/posts/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(server).get("/api/posts/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("updates the post and returns 204", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(server).put(`/api/posts/${id}`).send({
        blogId: blog.id,
        content: "Updated content",
        shortDescription: "Updated short",
        title: "Updated Title",
      });

      expect(res.status).toBe(204);
    });

    it("returns 400 with blogId field error when blogId does not exist", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(server).put(`/api/posts/${id}`).send({
        blogId: "000000000000000000000000",
        content: "Updated content",
        shortDescription: "Updated short",
        title: "Updated Title",
      });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "blogId", message: "blog not found" }),
        ]),
      );
    });

    it("returns 400 on validation failure", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(server)
        .put(`/api/posts/${id}`)
        .send({
          blogId: blog.id,
          content: "Content",
          shortDescription: "Short",
          title: "a".repeat(31),
        });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 404 for unknown id", async () => {
      const blog = await createBlog();

      const res = await request(server).put("/api/posts/000000000000000000000000").send({
        blogId: blog.id,
        content: "Content",
        shortDescription: "Short",
        title: "Title",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("deletes the post and returns 204", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(server).delete(`/api/posts/${id}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(server).delete("/api/posts/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/posts/:postId/comments", () => {
    it("returns 200 paginator with 0 items for a freshly-created post", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;

      const res = await request(server).get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        pagesCount: 0,
        pageSize: 10,
        totalCount: 0,
      });
    });

    it("returns 200 paginator with items after seeding comments", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);

      for (let i = 0; i < 3; i++) {
        await CommentModel.create({
          commentatorInfo: {
            userId: new mongoose.Types.ObjectId(userData.id),
            userLogin: userData.login,
          },
          content: `Seeded comment number ${i + 1} for post listing`,
          postId: new mongoose.Types.ObjectId(postId),
        });
      }

      const res = await request(server).get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(3);
      expect(res.body.pagesCount).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(10);
      expect(res.body.items).toHaveLength(3);
    });

    it("items match CommentViewModel shape", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);

      await CommentModel.create({
        commentatorInfo: {
          userId: new mongoose.Types.ObjectId(userData.id),
          userLogin: userData.login,
        },
        content: "Single seeded comment for shape verification",
        postId: new mongoose.Types.ObjectId(postId),
      });

      const res = await request(server).get(`/api/posts/${postId}/comments`);

      const item = res.body.items[0];
      expect(typeof item.id).toBe("string");
      expect(typeof item.content).toBe("string");
      expect(typeof item.createdAt).toBe("string");
      expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
      expect(typeof item.commentatorInfo.userId).toBe("string");
      expect(typeof item.commentatorInfo.userLogin).toBe("string");
    });

    it("default sort is createdAt desc — newest first", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);

      const dates = [
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-02T00:00:00.000Z"),
        new Date("2026-01-03T00:00:00.000Z"),
      ];

      for (const createdAt of dates) {
        await CommentModel.create({
          commentatorInfo: {
            userId: new mongoose.Types.ObjectId(userData.id),
            userLogin: userData.login,
          },
          content: `Comment dated ${createdAt.toISOString()} for sort test`,
          createdAt,
          postId: new mongoose.Types.ObjectId(postId),
        });
      }

      const res = await request(server).get(`/api/posts/${postId}/comments`);

      expect(res.body.items[0].createdAt).toBe("2026-01-03T00:00:00.000Z");
      expect(res.body.items[2].createdAt).toBe("2026-01-01T00:00:00.000Z");
    });

    it("sortDirection=asc reverses order to oldest first", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);

      const dates = [
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-02T00:00:00.000Z"),
        new Date("2026-01-03T00:00:00.000Z"),
      ];

      for (const createdAt of dates) {
        await CommentModel.create({
          commentatorInfo: {
            userId: new mongoose.Types.ObjectId(userData.id),
            userLogin: userData.login,
          },
          content: `Comment dated ${createdAt.toISOString()} for asc test`,
          createdAt,
          postId: new mongoose.Types.ObjectId(postId),
        });
      }

      const res = await request(server).get(`/api/posts/${postId}/comments?sortDirection=asc`);

      expect(res.body.items[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
      expect(res.body.items[2].createdAt).toBe("2026-01-03T00:00:00.000Z");
    });

    it("pageNumber=2&pageSize=1 returns the second item", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);

      const dates = [
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-02T00:00:00.000Z"),
        new Date("2026-01-03T00:00:00.000Z"),
      ];

      for (const createdAt of dates) {
        await CommentModel.create({
          commentatorInfo: {
            userId: new mongoose.Types.ObjectId(userData.id),
            userLogin: userData.login,
          },
          content: `Comment dated ${createdAt.toISOString()} for pagination test`,
          createdAt,
          postId: new mongoose.Types.ObjectId(postId),
        });
      }

      const res = await request(server).get(
        `/api/posts/${postId}/comments?pageNumber=2&pageSize=1&sortDirection=asc`,
      );

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(1);
      expect(res.body.totalCount).toBe(3);
      expect(res.body.pagesCount).toBe(3);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].createdAt).toBe("2026-01-02T00:00:00.000Z");
    });

    it("returns 404 empty body when postId is a valid ObjectId that does not exist", async () => {
      const res = await request(server).get("/api/posts/507f1f77bcf86cd799439011/comments");

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when postId is malformed", async () => {
      const res = await request(server).get("/api/posts/not-a-valid-id/comments");

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });
  });

  describe("POST /api/posts/:postId/comments", () => {
    it("returns 201 with CommentViewModel and correct commentatorInfo on success", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      const userData = await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(typeof res.body.content).toBe("string");
      expect(typeof res.body.createdAt).toBe("string");
      expect(res.body.commentatorInfo.userLogin).toBe(userData.login);
      expect(typeof res.body.commentatorInfo.userId).toBe("string");
    });

    it("comment is persisted in DB with correct postId after 201", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "This is a valid comment with enough characters" });

      const commentId: string = res.body.id;
      const doc = await CommentModel.findOne({ _id: commentId }).lean();
      expect(doc).not.toBeNull();
      expect(doc?.postId.toHexString()).toBe(postId);
    });

    it("returns 400 with errorsMessages when content is too short", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "too short" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "content" })]),
      );
    });

    it("returns 400 with errorsMessages when content is too long", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", `Bearer ${token}`)
        .send({ content: "a".repeat(301) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "content" })]),
      );
    });

    it("returns 401 empty body when no token is sent", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 empty body when token is invalid", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", "Bearer garbage.token.value")
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when postId is a valid ObjectId that does not exist", async () => {
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post("/api/posts/507f1f77bcf86cd799439011/comments")
        .set("authorization", `Bearer ${token}`)
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when postId is malformed", async () => {
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .post("/api/posts/not-a-valid-id/comments")
        .set("authorization", `Bearer ${token}`)
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 401 empty body for the other user that was added but then uses a bad token", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(otherUser);

      const res = await request(server)
        .post(`/api/posts/${postId}/comments`)
        .set("authorization", "Bearer notvalid.jwt.token")
        .send({ content: "This is a valid comment with enough characters" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });
  });

  describe("PUT /api/posts/:postId/like-status", () => {
    it("returns 401 empty body when no token is sent", async () => {
      const res = await request(server)
        .put("/api/posts/507f1f77bcf86cd799439011/like-status")
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 401 empty body when token is garbage", async () => {
      const res = await request(server)
        .put("/api/posts/507f1f77bcf86cd799439011/like-status")
        .set("authorization", "Bearer garbage.token.value")
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(401);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when postId is malformed", async () => {
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .put("/api/posts/not-a-valid-id/like-status")
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 404 empty body when postId is a valid ObjectId that does not exist", async () => {
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .put("/api/posts/507f1f77bcf86cd799439011/like-status")
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(res.status).toBe(404);
      expect(res.text).toBe("");
    });

    it("returns 400 with errorsMessages on field likeStatus when body is empty", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
      );
    });

    it("returns 400 with errorsMessages on field likeStatus when value is not in the enum", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const res = await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Loved" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
      );
    });

    it("returns 204 on a valid Like body and GET reflects updated extendedLikesInfo", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      const putRes = await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      expect(putRes.status).toBe(204);
      expect(putRes.text).toBe("");

      const getRes = await request(server)
        .get(`/api/posts/${postId}`)
        .set("authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.extendedLikesInfo).toMatchObject({
        dislikesCount: 0,
        likesCount: 1,
        myStatus: "Like",
      });
      expect(getRes.body.extendedLikesInfo.newestLikes).toHaveLength(1);
      expect(getRes.body.extendedLikesInfo.newestLikes[0].login).toBe(validUser.login);
    });

    it("Like → Dislike → None updates counters and myStatus at every step", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      const afterLike = await request(server)
        .get(`/api/posts/${postId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterLike.body.extendedLikesInfo).toMatchObject({
        dislikesCount: 0,
        likesCount: 1,
        myStatus: "Like",
      });

      await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Dislike" });
      const afterDislike = await request(server)
        .get(`/api/posts/${postId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterDislike.body.extendedLikesInfo).toMatchObject({
        dislikesCount: 1,
        likesCount: 0,
        myStatus: "Dislike",
      });
      expect(afterDislike.body.extendedLikesInfo.newestLikes).toEqual([]);

      await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "None" });
      const afterNone = await request(server)
        .get(`/api/posts/${postId}`)
        .set("authorization", `Bearer ${token}`);
      expect(afterNone.body.extendedLikesInfo).toMatchObject({
        dislikesCount: 0,
        likesCount: 0,
        myStatus: "None",
      });
      expect(afterNone.body.extendedLikesInfo.newestLikes).toEqual([]);
    });
  });

  describe("GET /api/posts and GET /api/posts/:id — extendedLikesInfo", () => {
    it("anonymous GET /:id returns myStatus=None even when other users liked", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      const res = await request(server).get(`/api/posts/${postId}`);

      expect(res.status).toBe(200);
      expect(res.body.extendedLikesInfo).toMatchObject({
        likesCount: 1,
        myStatus: "None",
      });
      expect(res.body.extendedLikesInfo.newestLikes).toHaveLength(1);
    });

    it("newestLikes is at most 3 items sorted by addedAt desc", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(server).post("/api/posts").send(postBody);
      const postId: string = created.body.id;

      const baseTime = new Date("2026-01-01T00:00:00.000Z").valueOf();
      const seededLikes = [
        { addedAtMs: baseTime + 0, login: "user1" },
        { addedAtMs: baseTime + 1000, login: "user2" },
        { addedAtMs: baseTime + 2000, login: "user3" },
        { addedAtMs: baseTime + 3000, login: "user4" },
        { addedAtMs: baseTime + 4000, login: "user5" },
      ];

      for (const seed of seededLikes) {
        await PostLikeModel.create({
          createdAt: new Date(seed.addedAtMs),
          postId: new mongoose.Types.ObjectId(postId),
          status: "Like",
          userId: new mongoose.Types.ObjectId(),
          userLogin: seed.login,
        });
      }
      await PostModel.updateOne(
        { _id: new mongoose.Types.ObjectId(postId) },
        { $set: { likesCount: seededLikes.length } },
      );

      const res = await request(server).get(`/api/posts/${postId}`);

      expect(res.status).toBe(200);
      expect(res.body.extendedLikesInfo.likesCount).toBe(5);
      expect(res.body.extendedLikesInfo.newestLikes).toHaveLength(3);

      const logins = (res.body.extendedLikesInfo.newestLikes as { login: string }[]).map(
        (like) => like.login,
      );
      expect(logins).toEqual(["user5", "user4", "user3"]);

      const timestamps = (res.body.extendedLikesInfo.newestLikes as { addedAt: string }[]).map(
        (like) => new Date(like.addedAt).valueOf(),
      );
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1] ?? 0);
      expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[2] ?? 0);
    });

    it("GET /api/posts returns per-item myStatus matching the authenticated viewer", async () => {
      const blog = await createBlog();
      const likedRes = await request(server)
        .post("/api/posts")
        .send(await buildValidPost(blog.id));
      const dislikedRes = await request(server)
        .post("/api/posts")
        .send(await buildValidPost(blog.id));
      const untouchedRes = await request(server)
        .post("/api/posts")
        .send(await buildValidPost(blog.id));
      const likedId: string = likedRes.body.id;
      const dislikedId: string = dislikedRes.body.id;
      const untouchedId: string = untouchedRes.body.id;

      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      await request(server)
        .put(`/api/posts/${likedId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });
      await request(server)
        .put(`/api/posts/${dislikedId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Dislike" });

      const res = await request(server).get("/api/posts").set("authorization", `Bearer ${token}`);

      const byId = new Map(
        (
          res.body.items as {
            extendedLikesInfo: { myStatus: string; newestLikes: unknown[] };
            id: string;
          }[]
        ).map((item) => [item.id, item.extendedLikesInfo] as const),
      );
      expect(byId.get(likedId)?.myStatus).toBe("Like");
      expect(byId.get(dislikedId)?.myStatus).toBe("Dislike");
      expect(byId.get(untouchedId)?.myStatus).toBe("None");
      expect(byId.get(untouchedId)?.newestLikes).toEqual([]);
    });

    it("GET /api/posts anonymously returns myStatus=None on every item", async () => {
      const blog = await createBlog();
      const created = await request(server)
        .post("/api/posts")
        .send(await buildValidPost(blog.id));
      const postId: string = created.body.id;
      await createUserViaHelper(validUser);
      const token = await loginAs({ loginOrEmail: validUser.login, password: validUser.password });

      await request(server)
        .put(`/api/posts/${postId}/like-status`)
        .set("authorization", `Bearer ${token}`)
        .send({ likeStatus: "Like" });

      const res = await request(server).get("/api/posts");

      expect(res.status).toBe(200);
      for (const item of res.body.items as {
        extendedLikesInfo: { myStatus: string };
      }[]) {
        expect(item.extendedLikesInfo.myStatus).toBe("None");
      }
    });
  });
});
