import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

describe("Testing API", () => {
  describe("DELETE /api/testing/all-data", () => {
    it("returns 204 with empty database", async () => {
      const res = await request(app).delete("/api/testing/all-data");

      expect(res.status).toBe(204);
    });

    it("clears all blogs, posts and videos", async () => {
      await request(app).post("/api/blogs").send({
        description: "desc",
        name: "Blog",
        websiteUrl: "https://example.com",
      });

      const blogRes = await request(app).get("/api/blogs");
      const blogId: string = blogRes.body[0].id;

      await request(app).post("/api/posts").send({
        blogId,
        content: "Content",
        shortDescription: "Short",
        title: "Post",
      });

      await request(app)
        .post("/api/videos")
        .send({
          author: "Author",
          availableResolutions: ["P480"],
          title: "Video",
        });

      await request(app).delete("/api/testing/all-data");

      const [blogs, posts, videos] = await Promise.all([
        request(app).get("/api/blogs"),
        request(app).get("/api/posts"),
        request(app).get("/api/videos"),
      ]);

      expect(blogs.body).toEqual([]);
      expect(posts.body).toEqual([]);
      expect(videos.body).toEqual([]);
    });
  });
});
