import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validBlogBody = {
  description: "Blog description",
  name: "My Blog",
  websiteUrl: "https://myblog.com",
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
  const res = await request(app).post("/api/blogs").send(validBlogBody);
  return res.body as { id: string; name: string };
}

describe("Posts API", () => {
  describe("GET /api/posts", () => {
    it("returns empty paginator when no posts exist", async () => {
      const res = await request(app).get("/api/posts");

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
      await request(app).post("/api/posts").send(postBody);

      const res = await request(app).get("/api/posts");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.pagesCount).toBe(1);
    });

    it("respects pageNumber and pageSize", async () => {
      const blog = await createBlog();
      for (let i = 1; i <= 4; i++) {
        await request(app)
          .post("/api/posts")
          .send({ ...(await buildValidPost(blog.id)), title: `Post ${i}` });
      }

      const res = await request(app).get("/api/posts?pageNumber=2&pageSize=3");

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(3);
      expect(res.body.totalCount).toBe(4);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(1);
    });

    it("sorts by title asc", async () => {
      const blog = await createBlog();
      await request(app)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Zebra" });
      await request(app)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Apple" });

      const res = await request(app).get("/api/posts?sortBy=title&sortDirection=asc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe("Apple");
      expect(res.body.items[1].title).toBe("Zebra");
    });

    it("sorts by title desc", async () => {
      const blog = await createBlog();
      await request(app)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Zebra" });
      await request(app)
        .post("/api/posts")
        .send({ ...(await buildValidPost(blog.id)), title: "Apple" });

      const res = await request(app).get("/api/posts?sortBy=title&sortDirection=desc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe("Zebra");
      expect(res.body.items[1].title).toBe("Apple");
    });

    it("returns 400 for invalid sortBy field", async () => {
      const res = await request(app).get("/api/posts?sortBy=invalid");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/posts", () => {
    it("creates a post and returns 201 with blogName filled from the blog", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);

      const res = await request(app).post("/api/posts").send(postBody);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.title).toBe(postBody.title);
      expect(res.body.blogId).toBe(blog.id);
      expect(res.body.blogName).toBe(validBlogBody.name);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("returns 400 with blogId field error when blogId does not exist", async () => {
      const res = await request(app).post("/api/posts").send({
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

      const res = await request(app).post("/api/posts").send({
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

      const res = await request(app)
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

      const res = await request(app)
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

      const res = await request(app)
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

      const res = await request(app).post("/api/posts").send({
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
      const created = await request(app).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(app).get(`/api/posts/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).get("/api/posts/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/posts/:id", () => {
    it("updates the post and returns 204", async () => {
      const blog = await createBlog();
      const postBody = await buildValidPost(blog.id);
      const created = await request(app).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(app).put(`/api/posts/${id}`).send({
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
      const created = await request(app).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(app).put(`/api/posts/${id}`).send({
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
      const created = await request(app).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(app)
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

      const res = await request(app).put("/api/posts/000000000000000000000000").send({
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
      const created = await request(app).post("/api/posts").send(postBody);
      const id: string = created.body.id;

      const res = await request(app).delete(`/api/posts/${id}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).delete("/api/posts/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });
});
