import type { INestApplication } from "@nestjs/common";

import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { signAccessToken } from "../../../core/jwt.js";
import { createTestApp } from "../../../test/create-test-app.js";
import { truncateAllTables } from "../../../test/truncate.js";
import { BlogsModule } from "../../blogs/blogs.module.js";
import { PostsModule } from "../../posts/posts.module.js";
import { UserAccountsModule } from "../../user-accounts/user-accounts.module.js";
import { UserEntity } from "../../user-accounts/users/domain/user.entity.js";
import { CommentsModule } from "../comments.module.js";

const VALID_COMMENT = "A perfectly valid long comment body content";
const SHORT_COMMENT = "too-short";
const LONG_COMMENT = "x".repeat(301);

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let userRepo: Repository<UserEntity>;
let userSuffix = 0;

async function createBlog(): Promise<number> {
  const res = await request(server)
    .post("/api/blogs")
    .send({
      description: "Blog description",
      name: "Tech",
      websiteUrl: "https://example.com",
    })
    .expect(201);
  return res.body.id as number;
}

async function createPost(blogId: number): Promise<number> {
  const res = await request(server)
    .post(`/api/blogs/${blogId}/posts`)
    .send({
      content: "Post content body",
      shortDescription: "Short description",
      title: "Post Title",
    })
    .expect(201);
  return res.body.id as number;
}

async function registerAndLoginUser(): Promise<{
  accessToken: string;
  login: string;
  userId: number;
}> {
  userSuffix += 1;
  const login = `user${userSuffix}`;
  const saved = await userRepo.save(
    userRepo.create({
      email: `${login}@example.com`,
      emailConfirmationCode: null,
      emailConfirmationExpiresAt: null,
      emailIsConfirmed: true,
      login,
      passwordHash: "test-hash-not-used",
      passwordRecoveryCode: null,
      passwordRecoveryExpiresAt: null,
      role: "user",
    }),
  );
  const accessToken = await signAccessToken({ userId: saved.id });
  return { accessToken, login, userId: saved.id };
}

beforeAll(async () => {
  app = await createTestApp([BlogsModule, PostsModule, CommentsModule, UserAccountsModule]);
  server = app.getHttpServer();
  userRepo = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
});

beforeEach(async () => {
  await truncateAllTables(app);
  userSuffix = 0;
});

afterAll(async () => {
  await app.close();
});

describe("Comments API — POST /api/posts/:postId/comments", () => {
  it("returns 401 when no bearer token is provided", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);

    await request(server)
      .post(`/api/posts/${postId}/comments`)
      .send({ content: VALID_COMMENT })
      .expect(401);
  });

  it("creates a comment and returns 201 with the CommentViewModel shape", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken, login, userId } = await registerAndLoginUser();

    const res = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    expect(res.body).toMatchObject({
      commentatorInfo: { userId, userLogin: login },
      content: VALID_COMMENT,
      likesInfo: { dislikesCount: 0, likesCount: 0, myStatus: "None" },
    });
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it("returns 404 when the post does not exist", async () => {
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .post("/api/posts/999999/comments")
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(404);
  });

  it("returns 400 with field 'content' when the body is too short", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();

    const res = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: SHORT_COMMENT })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "content" })]),
    );
  });

  it("returns 400 with field 'content' when the body is too long", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();

    const res = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: LONG_COMMENT })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "content" })]),
    );
  });
});

describe("Comments API — GET /api/posts/:postId/comments", () => {
  it("returns a paginated empty list when the post has no comments", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);

    const res = await request(server).get(`/api/posts/${postId}/comments`).expect(200);

    expect(res.body).toMatchObject({
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("orders comments by createdAt desc by default", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: `${VALID_COMMENT} first` })
      .expect(201);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: `${VALID_COMMENT} second` })
      .expect(201);

    const res = await request(server).get(`/api/posts/${postId}/comments`).expect(200);

    expect(res.body.totalCount).toBe(2);
    expect(res.body.items[0]?.content).toBe(`${VALID_COMMENT} second`);
    expect(res.body.items[1]?.content).toBe(`${VALID_COMMENT} first`);
  });

  it("returns 404 when the post does not exist", async () => {
    await request(server).get("/api/posts/999999/comments").expect(404);
  });

  it("reflects per-item myStatus for the authenticated viewer", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const author = await registerAndLoginUser();

    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server)
      .get(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .expect(200);

    expect(res.body.items[0]?.likesInfo.myStatus).toBe("Like");
    expect(res.body.items[0]?.likesInfo.likesCount).toBe(1);
  });
});

describe("Comments API — GET /api/comments/:commentId", () => {
  it("returns 200 with the CommentViewModel", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const res = await request(server).get(`/api/comments/${created.body.id}`).expect(200);

    expect(res.body).toMatchObject({
      content: VALID_COMMENT,
      id: created.body.id,
      likesInfo: { dislikesCount: 0, likesCount: 0, myStatus: "None" },
    });
  });

  it("returns 404 for an unknown comment id", async () => {
    await request(server).get("/api/comments/999999").expect(404);
  });

  it("returns myStatus None for anonymous viewers", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const author = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server).get(`/api/comments/${created.body.id}`).expect(200);

    expect(res.body.likesInfo).toMatchObject({ likesCount: 1, myStatus: "None" });
  });

  it("returns myStatus Like for the viewer who liked the comment", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const author = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server)
      .get(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${author.accessToken}`)
      .expect(200);

    expect(res.body.likesInfo).toMatchObject({ likesCount: 1, myStatus: "Like" });
  });
});

describe("Comments API — PUT /api/comments/:commentId", () => {
  it("returns 401 without a bearer token", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}`)
      .send({ content: `${VALID_COMMENT} updated` })
      .expect(401);
  });

  it("updates the content and returns 204 when called by the owner", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: `${VALID_COMMENT} updated` })
      .expect(204);

    const fetched = await request(server).get(`/api/comments/${created.body.id}`).expect(200);
    expect(fetched.body.content).toBe(`${VALID_COMMENT} updated`);
  });

  it("returns 403 when called by a different user", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const owner = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${owner.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const intruder = await registerAndLoginUser();

    await request(server)
      .put(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${intruder.accessToken}`)
      .send({ content: `${VALID_COMMENT} hijacked` })
      .expect(403);
  });

  it("returns 400 with field 'content' on invalid body", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const res = await request(server)
      .put(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: SHORT_COMMENT })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "content" })]),
    );
  });

  it("returns 404 when the comment does not exist", async () => {
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put("/api/comments/999999")
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(404);
  });
});

describe("Comments API — DELETE /api/comments/:commentId", () => {
  it("returns 401 without a bearer token", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server).delete(`/api/comments/${created.body.id}`).expect(401);
  });

  it("returns 204 and removes the comment when called by the owner", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .delete(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(server).get(`/api/comments/${created.body.id}`).expect(404);
  });

  it("returns 403 when called by a different user", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const owner = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${owner.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const intruder = await registerAndLoginUser();

    await request(server)
      .delete(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${intruder.accessToken}`)
      .expect(403);
  });

  it("returns 404 when the comment does not exist", async () => {
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .delete("/api/comments/999999")
      .set("authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});

describe("Comments API — PUT /api/comments/:commentId/like-status", () => {
  it("returns 401 without a bearer token", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .send({ likeStatus: "Like" })
      .expect(401);
  });

  it("returns 204 on a valid Like and reflects likesCount/myStatus in subsequent GET", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server)
      .get(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.likesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 1,
      myStatus: "Like",
    });
  });

  it("clears the like when transitioning from Like to None", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "None" })
      .expect(204);

    const res = await request(server)
      .get(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.likesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 0,
      myStatus: "None",
    });
  });

  it("flips the counters when transitioning from Like to Dislike", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Dislike" })
      .expect(204);

    const res = await request(server)
      .get(`/api/comments/${created.body.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.likesInfo).toMatchObject({
      dislikesCount: 1,
      likesCount: 0,
      myStatus: "Dislike",
    });
  });

  it("aggregates likes from multiple users into likesCount", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const alice = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${alice.accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const bob = await registerAndLoginUser();

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${alice.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${bob.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server).get(`/api/comments/${created.body.id}`).expect(200);
    expect(res.body.likesInfo).toMatchObject({ dislikesCount: 0, likesCount: 2 });
  });

  it("returns 400 with field 'likeStatus' on an invalid value", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const { accessToken } = await registerAndLoginUser();
    const created = await request(server)
      .post(`/api/posts/${postId}/comments`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ content: VALID_COMMENT })
      .expect(201);

    const res = await request(server)
      .put(`/api/comments/${created.body.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Lol" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
    );
  });

  it("returns 404 when the comment does not exist", async () => {
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put("/api/comments/999999/like-status")
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(404);
  });
});
