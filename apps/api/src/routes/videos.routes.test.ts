import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validCreateBody = {
  author: "Author Name",
  availableResolutions: ["P720"],
  title: "My Video",
};

describe("Videos API", () => {
  describe("GET /api/videos", () => {
    it("returns empty array when no videos exist", async () => {
      const res = await request(app).get("/api/videos");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all videos after creating one", async () => {
      await request(app).post("/api/videos").send(validCreateBody);

      const res = await request(app).get("/api/videos");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("POST /api/videos", () => {
    it("creates a video and returns 201 with correct defaults", async () => {
      const res = await request(app).post("/api/videos").send(validCreateBody);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("number");
      expect(res.body.title).toBe(validCreateBody.title);
      expect(res.body.author).toBe(validCreateBody.author);
      expect(res.body.canBeDownloaded).toBe(false);
      expect(res.body.minAgeRestriction).toBeNull();
      expect(typeof res.body.createdAt).toBe("string");
      expect(typeof res.body.publicationDate).toBe("string");
    });

    it("sets publicationDate 24 hours after createdAt", async () => {
      const res = await request(app).post("/api/videos").send(validCreateBody);

      const createdMs = new Date(res.body.createdAt as string).getTime();
      const publicationMs = new Date(res.body.publicationDate as string).getTime();

      expect(publicationMs - createdMs).toBe(24 * 60 * 60 * 1000);
    });

    it("returns 400 when title is empty", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, title: "" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 400 when title exceeds 40 characters", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, title: "a".repeat(41) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 400 when author is empty", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, author: "" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "author" })]),
      );
    });

    it("returns 400 when author exceeds 20 characters", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, author: "a".repeat(21) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "author" })]),
      );
    });

    it("returns 400 when availableResolutions is empty array", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, availableResolutions: [] });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "availableResolutions" })]),
      );
    });

    it("returns 400 when availableResolutions contains invalid resolution", async () => {
      const res = await request(app)
        .post("/api/videos")
        .send({ ...validCreateBody, availableResolutions: ["P999"] });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "availableResolutions.0" })]),
      );
    });
  });

  describe("GET /api/videos/:id", () => {
    it("returns the video by id", async () => {
      const created = await request(app).post("/api/videos").send(validCreateBody);
      const id: number = created.body.id;

      const res = await request(app).get(`/api/videos/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.title).toBe(validCreateBody.title);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).get("/api/videos/999999999");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/videos/:id", () => {
    it("updates the video and returns 204", async () => {
      const created = await request(app).post("/api/videos").send(validCreateBody);
      const id: number = created.body.id;

      const publicationDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .put(`/api/videos/${id}`)
        .send({
          author: "Updated Author",
          availableResolutions: ["P1080"],
          canBeDownloaded: true,
          minAgeRestriction: 12,
          publicationDate,
          title: "Updated Title",
        });

      expect(res.status).toBe(204);
    });

    it("returns 400 on validation failure", async () => {
      const created = await request(app).post("/api/videos").send(validCreateBody);
      const id: number = created.body.id;

      const res = await request(app)
        .put(`/api/videos/${id}`)
        .send({
          author: "Author",
          availableResolutions: ["P720"],
          canBeDownloaded: false,
          minAgeRestriction: null,
          publicationDate: new Date().toISOString(),
          title: "a".repeat(41),
        });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "title" })]),
      );
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app)
        .put("/api/videos/999999999")
        .send({
          author: "Author",
          availableResolutions: ["P720"],
          canBeDownloaded: false,
          minAgeRestriction: null,
          publicationDate: new Date().toISOString(),
          title: "Title",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/videos/:id", () => {
    it("deletes the video and returns 204", async () => {
      const created = await request(app).post("/api/videos").send(validCreateBody);
      const id: number = created.body.id;

      const res = await request(app).delete(`/api/videos/${id}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 for unknown id", async () => {
      const res = await request(app).delete("/api/videos/999999999");

      expect(res.status).toBe(404);
    });
  });
});
