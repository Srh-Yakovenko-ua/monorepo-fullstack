import type { INestApplication } from "@nestjs/common";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminAndLogin } from "../../test/auth-helpers.js";
import { createTestApp } from "../../test/create-test-app.js";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

beforeAll(async () => {
  app = await createTestApp();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

describe("Testing API", () => {
  describe("DELETE /api/testing/all-data", () => {
    it("returns 204 with empty database", async () => {
      const res = await request(server).delete("/api/testing/all-data");

      expect(res.status).toBe(204);
    });

    it("clears all blogs, posts and videos", async () => {
      const adminToken = await createAdminAndLogin(app);

      await request(server).post("/api/blogs").set("authorization", `Bearer ${adminToken}`).send({
        description: "desc",
        name: "Blog",
        websiteUrl: "https://example.com",
      });

      const blogRes = await request(server).get("/api/blogs");
      const blogId: string = blogRes.body.items[0].id;

      await request(server).post("/api/posts").set("authorization", `Bearer ${adminToken}`).send({
        blogId,
        content: "Content",
        shortDescription: "Short",
        title: "Post",
      });

      await request(server)
        .post("/api/videos")
        .set("authorization", `Bearer ${adminToken}`)
        .send({
          author: "Author",
          availableResolutions: ["P480"],
          title: "Video",
        });

      await request(server).delete("/api/testing/all-data");

      const [blogs, posts, videos] = await Promise.all([
        request(server).get("/api/blogs"),
        request(server).get("/api/posts"),
        request(server).get("/api/videos"),
      ]);

      expect(blogs.body.items).toEqual([]);
      expect(posts.body.items).toEqual([]);
      expect(videos.body).toEqual([]);
    });
  });
});
