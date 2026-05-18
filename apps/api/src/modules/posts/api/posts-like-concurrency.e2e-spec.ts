import type { BlogViewModel, PostViewModel } from "@app/shared";
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
import { UserAccountsModule } from "../../user-accounts/user-accounts.module.js";
import { UserEntity } from "../../user-accounts/users/domain/user.entity.js";
import { PostsModule } from "../posts.module.js";

const CONCURRENT_LIKER_COUNT = 10;

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let userRepo: Repository<UserEntity>;
let userSuffix = 0;

beforeAll(async () => {
  app = await createTestApp([PostsModule, BlogsModule, UserAccountsModule]);
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

async function createBlog(): Promise<BlogViewModel> {
  const res = await request(server)
    .post("/api/blogs")
    .send({
      description: "Concurrency test blog description",
      name: "Conc Blog",
      websiteUrl: "https://example.com",
    })
    .expect(201);
  return res.body as BlogViewModel;
}

async function createPost(blogId: number): Promise<PostViewModel> {
  const res = await request(server)
    .post("/api/posts")
    .send({
      blogId,
      content: "Concurrency test post body",
      shortDescription: "Short",
      title: "Concurrency Post",
    })
    .expect(201);
  return res.body as PostViewModel;
}

async function registerAndLoginUser(): Promise<{
  accessToken: string;
  login: string;
  userId: number;
}> {
  userSuffix += 1;
  const login = `concurrent-user-${userSuffix}`;
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

describe("Posts API — PUT /api/posts/:postId/like-status (concurrency)", () => {
  it("counts every Like exactly once when N distinct users like the same post in parallel", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const likers = await Promise.all(
      Array.from({ length: CONCURRENT_LIKER_COUNT }, () => registerAndLoginUser()),
    );

    const responses = await Promise.all(
      likers.map((liker) =>
        request(server)
          .put(`/api/posts/${post.id}/like-status`)
          .set("authorization", `Bearer ${liker.accessToken}`)
          .send({ likeStatus: "Like" }),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(204);
    }

    const fetched = await request(server).get(`/api/posts/${post.id}`).expect(200);
    expect(fetched.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: CONCURRENT_LIKER_COUNT,
    });
  });

  it("keeps counters consistent when the same user fires repeated Like requests in parallel", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const liker = await registerAndLoginUser();

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_LIKER_COUNT }, () =>
        request(server)
          .put(`/api/posts/${post.id}/like-status`)
          .set("authorization", `Bearer ${liker.accessToken}`)
          .send({ likeStatus: "Like" }),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(204);
    }

    const fetched = await request(server).get(`/api/posts/${post.id}`).expect(200);
    expect(fetched.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 1,
    });
  });
});
