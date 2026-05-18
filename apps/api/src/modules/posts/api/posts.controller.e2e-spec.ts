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

const validBlogInput = {
  description: "Tech blog about backend testing",
  name: "Tech Blog",
  websiteUrl: "https://example.com",
};

function buildPostInput(blogId: number): {
  blogId: number;
  content: string;
  shortDescription: string;
  title: string;
} {
  return {
    blogId,
    content: "Body of the post that describes the topic",
    shortDescription: "Short summary",
    title: "Post Title",
  };
}

async function createBlog(overrides: Partial<typeof validBlogInput> = {}): Promise<BlogViewModel> {
  const res = await request(server)
    .post("/api/blogs")
    .send({ ...validBlogInput, ...overrides })
    .expect(201);
  return res.body as BlogViewModel;
}

async function createPost(blogId: number): Promise<PostViewModel> {
  const res = await request(server).post("/api/posts").send(buildPostInput(blogId)).expect(201);
  return res.body as PostViewModel;
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
      role: ROLE.user,
    }),
  );
  const accessToken = await signAccessToken({ userId: saved.id });
  return { accessToken, login, userId: saved.id };
}

describe("Posts API — GET /api/posts", () => {
  it("returns an empty paginator when no posts exist", async () => {
    const res = await request(server).get("/api/posts").expect(200);

    expect(res.body).toEqual({
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("returns paginated items honoring pageSize, pageNumber and sortDirection", async () => {
    const blog = await createBlog();
    await createPost(blog.id);
    await createPost(blog.id);
    await createPost(blog.id);

    const res = await request(server)
      .get("/api/posts")
      .query({ pageNumber: "1", pageSize: "2", sortBy: "createdAt", sortDirection: "asc" })
      .expect(200);

    expect(res.body).toMatchObject({
      page: 1,
      pagesCount: 2,
      pageSize: 2,
      totalCount: 3,
    });
    expect(res.body.items).toHaveLength(2);
  });

  it("returns 400 with field 'sortBy' on an unknown sortBy value", async () => {
    const res = await request(server)
      .get("/api/posts")
      .query({ sortBy: "unknownField" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "sortBy" })]),
    );
  });
});

describe("Posts API — GET /api/posts/:id", () => {
  it("returns the post with default extendedLikesInfo when no viewer", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);

    const res = await request(server).get(`/api/posts/${post.id}`).expect(200);

    expect(res.body).toMatchObject({
      blogId: blog.id,
      blogName: blog.name,
      content: "Body of the post that describes the topic",
      extendedLikesInfo: {
        dislikesCount: 0,
        likesCount: 0,
        myStatus: "None",
        newestLikes: [],
      },
      id: post.id,
      shortDescription: "Short summary",
      title: "Post Title",
    });
    expect(typeof res.body.createdAt).toBe("string");
  });

  it("returns 404 for an unknown post id", async () => {
    await request(server).get("/api/posts/999999").expect(404);
  });

  it("returns 400 when the id is not an integer", async () => {
    await request(server).get("/api/posts/not-a-number").expect(400);
  });

  it("returns myStatus 'Like' when the viewer is a user who liked the post", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server)
      .get(`/api/posts/${post.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 1,
      myStatus: "Like",
    });
  });
});

describe("Posts API — GET /api/blogs/:id/posts", () => {
  it("returns only posts that belong to the blog", async () => {
    const blogA = await createBlog({ name: "Blog A" });
    const blogB = await createBlog({ name: "Blog B" });
    await createPost(blogA.id);
    await createPost(blogA.id);
    await createPost(blogB.id);

    const res = await request(server).get(`/api/blogs/${blogA.id}/posts`).expect(200);

    expect(res.body.totalCount).toBe(2);
    expect(res.body.items).toHaveLength(2);
    for (const item of res.body.items as PostViewModel[]) {
      expect(item.blogId).toBe(blogA.id);
    }
  });

  it("returns 404 when the blog does not exist", async () => {
    await request(server).get("/api/blogs/999999/posts").expect(404);
  });
});

describe("Posts API — POST /api/posts", () => {
  it("creates a post with valid body and an existing blogId", async () => {
    const blog = await createBlog();

    const res = await request(server).post("/api/posts").send(buildPostInput(blog.id)).expect(201);

    expect(res.body).toMatchObject({
      blogId: blog.id,
      blogName: blog.name,
      content: "Body of the post that describes the topic",
      extendedLikesInfo: {
        dislikesCount: 0,
        likesCount: 0,
        myStatus: "None",
        newestLikes: [],
      },
      shortDescription: "Short summary",
      title: "Post Title",
    });
    expect(typeof res.body.id).toBe("number");
    expect(typeof res.body.createdAt).toBe("string");
  });

  it("returns 400 with field 'blogId' when the referenced blog does not exist", async () => {
    const res = await request(server).post("/api/posts").send(buildPostInput(999999)).expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "blogId" })]),
    );
  });

  it("returns 400 with field 'title' when the title is empty", async () => {
    const blog = await createBlog();

    const res = await request(server)
      .post("/api/posts")
      .send({ ...buildPostInput(blog.id), title: "" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title" })]),
    );
  });

  it("returns 400 with field 'shortDescription' when it exceeds 100 characters", async () => {
    const blog = await createBlog();

    const res = await request(server)
      .post("/api/posts")
      .send({ ...buildPostInput(blog.id), shortDescription: "a".repeat(101) })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "shortDescription" })]),
    );
  });

  it("returns 400 with field 'content' when it exceeds 1000 characters", async () => {
    const blog = await createBlog();

    const res = await request(server)
      .post("/api/posts")
      .send({ ...buildPostInput(blog.id), content: "a".repeat(1001) })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "content" })]),
    );
  });
});

describe("Posts API — PUT /api/posts/:id", () => {
  it("updates an existing post and returns 204", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);

    await request(server)
      .put(`/api/posts/${post.id}`)
      .send({ ...buildPostInput(blog.id), title: "Updated" })
      .expect(204);

    const fetched = await request(server).get(`/api/posts/${post.id}`).expect(200);
    expect(fetched.body.title).toBe("Updated");
  });

  it("returns 404 when the post does not exist", async () => {
    const blog = await createBlog();

    await request(server).put("/api/posts/999999").send(buildPostInput(blog.id)).expect(404);
  });

  it("returns 400 with field 'title' on an invalid body", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);

    const res = await request(server)
      .put(`/api/posts/${post.id}`)
      .send({ ...buildPostInput(blog.id), title: "" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title" })]),
    );
  });
});

describe("Posts API — DELETE /api/posts/:id", () => {
  it("deletes an existing post and returns 204", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);

    await request(server).delete(`/api/posts/${post.id}`).expect(204);
    await request(server).get(`/api/posts/${post.id}`).expect(404);
  });

  it("returns 404 when the post does not exist", async () => {
    await request(server).delete("/api/posts/999999").expect(404);
  });
});

describe("Posts API — PUT /api/posts/:postId/like-status", () => {
  it("returns 401 without a bearer token", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .send({ likeStatus: "Like" })
      .expect(401);
  });

  it("returns 400 with field 'likeStatus' on an invalid status value", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    const res = await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Foo" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "likeStatus" })]),
    );
  });

  it("records a Like and updates the counters", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server)
      .get(`/api/posts/${post.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 1,
      myStatus: "Like",
    });
  });

  it("transitions Like -> Dislike and updates both counters", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);
    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Dislike" })
      .expect(204);

    const res = await request(server)
      .get(`/api/posts/${post.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 1,
      likesCount: 0,
      myStatus: "Dislike",
    });
  });

  it("transitions Like -> None and removes the user's row from counters", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);
    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "None" })
      .expect(204);

    const res = await request(server)
      .get(`/api/posts/${post.id}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.extendedLikesInfo).toMatchObject({
      dislikesCount: 0,
      likesCount: 0,
      myStatus: "None",
    });
    expect(res.body.extendedLikesInfo.newestLikes).toEqual([]);
  });

  it("is idempotent when the same user Likes twice", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);
    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server).get(`/api/posts/${post.id}`).expect(200);
    expect(res.body.extendedLikesInfo.likesCount).toBe(1);
  });

  it("counts likes from multiple users separately", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const firstLiker = await registerAndLoginUser();
    const secondLiker = await registerAndLoginUser();

    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${firstLiker.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);
    await request(server)
      .put(`/api/posts/${post.id}/like-status`)
      .set("authorization", `Bearer ${secondLiker.accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(204);

    const res = await request(server).get(`/api/posts/${post.id}`).expect(200);
    expect(res.body.extendedLikesInfo.likesCount).toBe(2);
  });

  it("returns the three most recent likers in newestLikes ordered by addedAt desc", async () => {
    const blog = await createBlog();
    const post = await createPost(blog.id);
    const likers = [
      await registerAndLoginUser(),
      await registerAndLoginUser(),
      await registerAndLoginUser(),
      await registerAndLoginUser(),
    ];

    for (const liker of likers) {
      await request(server)
        .put(`/api/posts/${post.id}/like-status`)
        .set("authorization", `Bearer ${liker.accessToken}`)
        .send({ likeStatus: "Like" })
        .expect(204);
    }

    const res = await request(server).get(`/api/posts/${post.id}`).expect(200);
    const newestLikes = res.body.extendedLikesInfo.newestLikes as {
      addedAt: string;
      login: string;
      userId: number;
    }[];

    expect(newestLikes).toHaveLength(3);
    expect(newestLikes.map((entry) => entry.login)).toEqual([
      likers[3]?.login,
      likers[2]?.login,
      likers[1]?.login,
    ]);
    for (const entry of newestLikes) {
      expect(typeof entry.userId).toBe("number");
      expect(typeof entry.addedAt).toBe("string");
    }
  });

  it("returns 404 when liking an unknown post", async () => {
    const { accessToken } = await registerAndLoginUser();

    await request(server)
      .put("/api/posts/999999/like-status")
      .set("authorization", `Bearer ${accessToken}`)
      .send({ likeStatus: "Like" })
      .expect(404);
  });
});
