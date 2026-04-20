import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validBlog = {
  description: "A blog about tech",
  name: "Tech Blog",
  websiteUrl: "https://techblog.com",
};

describe("Blogs API", () => {
  describe("GET /api/blogs", () => {
    it("returns empty array when no blogs exist", async () => {
      const res = await request(app).get("/api/blogs");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all blogs after creating one", async () => {
      await request(app).post("/api/blogs").send(validBlog);

      const res = await request(app).get("/api/blogs");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe(validBlog.name);
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
});
