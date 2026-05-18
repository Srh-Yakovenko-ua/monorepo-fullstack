import type { INestApplication } from "@nestjs/common";

import { ROLE } from "@app/shared";
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

const CONCURRENT_LIKER_COUNT = 10;
const VALID_COMMENT_BODY = "A perfectly valid long comment body content";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let userRepo: Repository<UserEntity>;
let userSuffix = 0;

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

async function createBlog(): Promise<number> {
  const res = await request(server)
    .post("/api/blogs")
    .send({
      description: "Concurrency comment-blog description",
      name: "Conc Blog",
      websiteUrl: "https://example.com",
    })
    .expect(201);
  return res.body.id as number;
}

async function createComment({
  accessToken,
  postId,
}: {
  accessToken: string;
  postId: number;
}): Promise<number> {
  const res = await request(server)
    .post(`/api/posts/${postId}/comments`)
    .set("authorization", `Bearer ${accessToken}`)
    .send({ content: VALID_COMMENT_BODY })
    .expect(201);
  return res.body.id as number;
}

async function createPost(blogId: number): Promise<number> {
  const res = await request(server)
    .post(`/api/blogs/${blogId}/posts`)
    .send({
      content: "Concurrency test post body",
      shortDescription: "Short",
      title: "Concurrency Post",
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
  const login = `concurrent-commenter-${userSuffix}`;
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
      role: ROLE.user,
    }),
  );
  const accessToken = await signAccessToken({ userId: saved.id });
  return { accessToken, login, userId: saved.id };
}

describe("Comments API — PUT /api/comments/:commentId/like-status (concurrency)", () => {
  it("counts every Like exactly once when N distinct users like the same comment in parallel", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const author = await registerAndLoginUser();
    const commentId = await createComment({ accessToken: author.accessToken, postId });

    const likers = await Promise.all(
      Array.from({ length: CONCURRENT_LIKER_COUNT }, () => registerAndLoginUser()),
    );

    const responses = await Promise.all(
      likers.map((liker) =>
        request(server)
          .put(`/api/comments/${commentId}/like-status`)
          .set("authorization", `Bearer ${liker.accessToken}`)
          .send({ likeStatus: "Like" }),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(204);
    }

    const fetched = await request(server).get(`/api/comments/${commentId}`).expect(200);
    expect(fetched.body.likesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: CONCURRENT_LIKER_COUNT,
    });
  });

  it("keeps comment counters consistent when one user fires repeated Likes in parallel", async () => {
    const blogId = await createBlog();
    const postId = await createPost(blogId);
    const author = await registerAndLoginUser();
    const commentId = await createComment({ accessToken: author.accessToken, postId });
    const liker = await registerAndLoginUser();

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_LIKER_COUNT }, () =>
        request(server)
          .put(`/api/comments/${commentId}/like-status`)
          .set("authorization", `Bearer ${liker.accessToken}`)
          .send({ likeStatus: "Like" }),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(204);
    }

    const fetched = await request(server).get(`/api/comments/${commentId}`).expect(200);
    expect(fetched.body.likesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 1,
    });
  });
});
