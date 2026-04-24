import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createAdminAndLogin } from "../test/auth-helpers.js";

const app = createApp();

describe("Testing API", () => {
  describe("DELETE /api/testing/all-data", () => {
    it("returns 204 with empty database", async () => {
      const res = await request(app).delete("/api/testing/all-data");

      expect(res.status).toBe(204);
    });

    it("clears all blogs, posts and videos", async () => {
      const adminToken = await createAdminAndLogin(app);

      await request(app).post("/api/blogs").set("authorization", `Bearer ${adminToken}`).send({
        description: "desc",
        name: "Blog",
        websiteUrl: "https://example.com",
      });

      const blogRes = await request(app).get("/api/blogs");
      const blogId: string = blogRes.body.items[0].id;

      await request(app).post("/api/posts").set("authorization", `Bearer ${adminToken}`).send({
        blogId,
        content: "Content",
        shortDescription: "Short",
        title: "Post",
      });

      await request(app)
        .post("/api/videos")
        .set("authorization", `Bearer ${adminToken}`)
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

      expect(blogs.body.items).toEqual([]);
      expect(posts.body.items).toEqual([]);
      expect(videos.body).toEqual([]);
    });
  });
});
