import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validBlog = {
  description: "A blog about tech",
  name: "Tech Blog",
  websiteUrl: "https://techblog.com",
};

const validPost = {
  content: "Post content body",
  shortDescription: "Short desc",
  title: "Post Title",
};

describe("Blogs API", () => {
  describe("GET /api/blogs", () => {
    it("returns empty paginator when no blogs exist", async () => {
      const res = await request(app).get("/api/blogs");

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
      await request(app).post("/api/blogs").send(validBlog);

      const res = await request(app).get("/api/blogs");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe(validBlog.name);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.pagesCount).toBe(1);
    });

    it("respects pageNumber and pageSize", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Blog A" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Blog B" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Blog C" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Blog D" });

      const res = await request(app).get("/api/blogs?pageNumber=2&pageSize=3");

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(3);
      expect(res.body.totalCount).toBe(4);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(1);
    });

    it("sorts by name asc", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Zebra" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Apple" });

      const res = await request(app).get("/api/blogs?sortBy=name&sortDirection=asc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].name).toBe("Apple");
      expect(res.body.items[1].name).toBe("Zebra");
    });

    it("sorts by name desc", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Zebra" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Apple" });

      const res = await request(app).get("/api/blogs?sortBy=name&sortDirection=desc");

      expect(res.status).toBe(200);
      expect(res.body.items[0].name).toBe("Zebra");
      expect(res.body.items[1].name).toBe("Apple");
    });

    it("filters by searchNameTerm case-insensitively", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Tech Blog" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Food Blog" });

      const res = await request(app).get("/api/blogs?searchNameTerm=tech");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe("Tech Blog");
    });

    it("empty searchNameTerm returns all blogs", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Tech Blog" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Food Blog" });

      const res = await request(app).get("/api/blogs?searchNameTerm=");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
    });

    it("absent searchNameTerm returns all blogs", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Tech Blog" });
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Food Blog" });

      const res = await request(app).get("/api/blogs");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
    });

    it("treats regex metacharacters in searchNameTerm as literal text", async () => {
      await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "Tech Blog" });

      const wildcardRes = await request(app).get("/api/blogs?searchNameTerm=*");
      expect(wildcardRes.status).toBe(200);
      expect(wildcardRes.body.items).toHaveLength(0);

      const charClassRes = await request(app).get(
        `/api/blogs?searchNameTerm=${encodeURIComponent("[a-z]")}`,
      );
      expect(charClassRes.status).toBe(200);
      expect(charClassRes.body.items).toHaveLength(0);
    });

    it("rejects searchNameTerm longer than 100 characters", async () => {
      const longTerm = "a".repeat(101);
      const res = await request(app).get(`/api/blogs?searchNameTerm=${longTerm}`);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid sortBy field", async () => {
      const res = await request(app).get("/api/blogs?sortBy=invalid");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/blogs", () => {
    it("creates a blog and returns 201 with view model", async () => {
      const res = await request(app).post("/api/blogs").send(validBlog);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.name).toBe(validBlog.name);
      expect(res.body.description).toBe(validBlog.description);
      expect(res.body.websiteUrl).toBe(validBlog.websiteUrl);
      expect(res.body.isMembership).toBe(false);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("returns 400 when name is missing", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .send({ description: "desc", websiteUrl: "https://x.com" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "name" })]),
      );
    });

    it("returns 400 when name exceeds 15 characters", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, name: "a".repeat(16) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "name" })]),
      );
    });

    it("returns 400 when description is missing", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .send({ name: "Blog", websiteUrl: "https://x.com" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "description" })]),
      );
    });

    it("returns 400 when description exceeds 500 characters", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, description: "a".repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "description" })]),
      );
    });

    it("returns 400 when websiteUrl is missing", async () => {
      const res = await request(app).post("/api/blogs").send({ description: "desc", name: "Blog" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "websiteUrl" })]),
      );
    });

    it("returns 400 when websiteUrl does not match required pattern", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .send({ ...validBlog, websiteUrl: "http://not-https.com" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "websiteUrl" })]),
      );
    });
  });

  describe("GET /api/blogs/:id", () => {
    it("returns the blog by id", async () => {
      const created = await request(app).post("/api/blogs").send(validBlog);
      const id: string = created.body.id;

      const res = await request(app).get(`/api/blogs/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.name).toBe(validBlog.name);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).get("/api/blogs/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/blogs/:id", () => {
    it("updates the blog and returns 204", async () => {
      const created = await request(app).post("/api/blogs").send(validBlog);
      const id: string = created.body.id;

      const res = await request(app)
        .put(`/api/blogs/${id}`)
        .send({ description: "Updated desc", name: "Updated", websiteUrl: "https://updated.com" });

      expect(res.status).toBe(204);
    });

    it("returns 400 on validation failure", async () => {
      const created = await request(app).post("/api/blogs").send(validBlog);
      const id: string = created.body.id;

      const res = await request(app)
        .put(`/api/blogs/${id}`)
        .send({ description: "desc", name: "a".repeat(16), websiteUrl: "https://x.com" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "name" })]),
      );
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).put("/api/blogs/000000000000000000000000").send(validBlog);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/blogs/:id", () => {
    it("deletes the blog and returns 204", async () => {
      const created = await request(app).post("/api/blogs").send(validBlog);
      const id: string = created.body.id;

      const res = await request(app).delete(`/api/blogs/${id}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).delete("/api/blogs/000000000000000000000000");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/blogs/:id/posts", () => {
    it("returns empty paginator for blog with no posts", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      const res = await request(app).get(`/api/blogs/${id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        pagesCount: 0,
        pageSize: 10,
        totalCount: 0,
      });
    });

    it("returns paginator with posts belonging to the blog", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      await request(app).post(`/api/blogs/${id}/posts`).send(validPost);
      await request(app)
        .post(`/api/blogs/${id}/posts`)
        .send({ ...validPost, title: "Post 2" });

      const res = await request(app).get(`/api/blogs/${id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.pagesCount).toBe(1);
    });

    it("returns 404 for unknown blog id", async () => {
      const res = await request(app).get("/api/blogs/000000000000000000000000/posts");

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid sortBy field", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      const res = await request(app).get(`/api/blogs/${id}/posts?sortBy=invalid`);

      expect(res.status).toBe(400);
    });

    it("respects pageNumber and pageSize", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      for (let i = 1; i <= 4; i++) {
        await request(app)
          .post(`/api/blogs/${id}/posts`)
          .send({ ...validPost, title: `Post ${i}` });
      }

      const res = await request(app).get(`/api/blogs/${id}/posts?pageNumber=2&pageSize=3`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(3);
      expect(res.body.totalCount).toBe(4);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(1);
    });
  });

  describe("POST /api/blogs/:id/posts", () => {
    it("creates a post for a blog and returns 201", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      const res = await request(app).post(`/api/blogs/${id}/posts`).send(validPost);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.title).toBe(validPost.title);
      expect(res.body.blogId).toBe(id);
      expect(res.body.blogName).toBe(validBlog.name);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("returns 404 for unknown blog id", async () => {
      const res = await request(app)
        .post("/api/blogs/000000000000000000000000/posts")
        .send(validPost);

      expect(res.status).toBe(404);
    });

    it("returns 400 on validation failure", async () => {
      const blog = await request(app).post("/api/blogs").send(validBlog);
      const id: string = blog.body.id;

      const res = await request(app)
        .post(`/api/blogs/${id}/posts`)
        .send({ content: "c", shortDescription: "s", title: "a".repeat(31) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });
  });
});
