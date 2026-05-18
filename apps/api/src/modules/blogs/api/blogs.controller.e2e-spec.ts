import type { BlogInput } from "@app/shared";
import type { INestApplication } from "@nestjs/common";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestApp } from "../../../test/create-test-app.js";
import { truncateAllTables } from "../../../test/truncate.js";
import { BlogsModule } from "../blogs.module.js";

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;

const validBlog: BlogInput = {
  description: "All about the world of technology",
  name: "Tech Blog",
  websiteUrl: "https://tech.example.com",
};

async function createBlogViaApi(overrides: Partial<BlogInput> = {}): Promise<number> {
  const res = await request(server)
    .post("/api/blogs")
    .send({ ...validBlog, ...overrides })
    .expect(201);
  return res.body.id as number;
}

beforeAll(async () => {
  app = await createTestApp([BlogsModule]);
  server = app.getHttpServer();
});

beforeEach(async () => {
  await truncateAllTables(app);
});

afterAll(async () => {
  await app.close();
});

describe("Blogs API — GET /api/blogs", () => {
  it("returns an empty paginated result when no blogs exist", async () => {
    const res = await request(server).get("/api/blogs").expect(200);

    expect(res.body).toEqual({
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("returns blogs with the default sort (createdAt desc)", async () => {
    await createBlogViaApi({ name: "First" });
    await createBlogViaApi({ name: "Second" });

    const res = await request(server).get("/api/blogs").expect(200);

    expect(res.body.totalCount).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].name).toBe("Second");
    expect(res.body.items[1].name).toBe("First");
  });

  it("returns each blog with the BlogViewModel shape", async () => {
    await createBlogViaApi();

    const res = await request(server).get("/api/blogs").expect(200);

    expect(res.body.items[0]).toMatchObject({
      createdAt: expect.any(String),
      description: validBlog.description,
      id: expect.any(Number),
      isMembership: false,
      name: validBlog.name,
      websiteUrl: validBlog.websiteUrl,
    });
  });

  it("filters by searchNameTerm case-insensitively", async () => {
    await createBlogViaApi({ name: "React Blog" });
    await createBlogViaApi({ name: "Vue Blog" });
    await createBlogViaApi({ name: "Angular" });

    const res = await request(server).get("/api/blogs?searchNameTerm=BLOG").expect(200);

    expect(res.body.totalCount).toBe(2);
    expect(res.body.items.map((item: { name: string }) => item.name).sort()).toEqual([
      "React Blog",
      "Vue Blog",
    ]);
  });

  it("paginates with pageNumber and pageSize", async () => {
    for (let index = 0; index < 5; index += 1) {
      await createBlogViaApi({ name: `Blog ${index}` });
    }

    const res = await request(server).get("/api/blogs?pageNumber=2&pageSize=2").expect(200);

    expect(res.body).toMatchObject({
      page: 2,
      pagesCount: 3,
      pageSize: 2,
      totalCount: 5,
    });
    expect(res.body.items).toHaveLength(2);
  });

  it("sorts by name ascending when sortBy=name and sortDirection=asc", async () => {
    await createBlogViaApi({ name: "Charlie" });
    await createBlogViaApi({ name: "Alpha" });
    await createBlogViaApi({ name: "Bravo" });

    const res = await request(server).get("/api/blogs?sortBy=name&sortDirection=asc").expect(200);

    expect(res.body.items.map((item: { name: string }) => item.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("sorts by createdAt descending by default with sortDirection=desc explicit", async () => {
    await createBlogViaApi({ name: "First" });
    await createBlogViaApi({ name: "Second" });
    await createBlogViaApi({ name: "Third" });

    const res = await request(server).get("/api/blogs?sortDirection=desc").expect(200);

    expect(res.body.items.map((item: { name: string }) => item.name)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
  });

  it("returns 400 when pageNumber is not a positive integer", async () => {
    const res = await request(server).get("/api/blogs?pageNumber=0").expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "pageNumber" })]),
    );
  });

  it("returns 400 when sortBy is not in the allowed set", async () => {
    const res = await request(server).get("/api/blogs?sortBy=banana").expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "sortBy" })]),
    );
  });
});

describe("Blogs API — GET /api/blogs/lookup", () => {
  it("returns lookup items with id + name only", async () => {
    await createBlogViaApi({ name: "Lookup Blog" });

    const res = await request(server).get("/api/blogs/lookup").expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual({
      id: expect.any(Number),
      name: "Lookup Blog",
    });
    expect(res.body.items[0]).not.toHaveProperty("description");
    expect(res.body.items[0]).not.toHaveProperty("websiteUrl");
  });
});

describe("Blogs API — GET /api/blogs/:id", () => {
  it("returns the blog by id with the BlogViewModel shape", async () => {
    const id = await createBlogViaApi();

    const res = await request(server).get(`/api/blogs/${id}`).expect(200);

    expect(res.body).toMatchObject({
      createdAt: expect.any(String),
      description: validBlog.description,
      id,
      isMembership: false,
      name: validBlog.name,
      websiteUrl: validBlog.websiteUrl,
    });
  });

  it("returns 404 when the blog does not exist", async () => {
    await request(server).get("/api/blogs/999999").expect(404);
  });

  it("returns 400 when the id is not a valid integer", async () => {
    await request(server).get("/api/blogs/not-a-number").expect(400);
  });
});

describe("Blogs API — POST /api/blogs", () => {
  it("creates a blog and returns 201 with the BlogViewModel", async () => {
    const res = await request(server).post("/api/blogs").send(validBlog).expect(201);

    expect(res.body).toMatchObject({
      createdAt: expect.any(String),
      description: validBlog.description,
      id: expect.any(Number),
      isMembership: false,
      name: validBlog.name,
      websiteUrl: validBlog.websiteUrl,
    });
  });

  it("returns 400 with field 'name' when name is empty", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ ...validBlog, name: "" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "name" })]),
    );
  });

  it("returns 400 with field 'name' when name is longer than 15 characters", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ ...validBlog, name: "a".repeat(16) })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "name" })]),
    );
  });

  it("returns 400 with field 'description' when description is longer than 500 characters", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ ...validBlog, description: "a".repeat(501) })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "description" })]),
    );
  });

  it("returns 400 with field 'websiteUrl' when the URL does not start with https://", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ ...validBlog, websiteUrl: "http://example.com" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "websiteUrl" })]),
    );
  });

  it("returns 400 with field 'websiteUrl' when the URL is malformed", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ ...validBlog, websiteUrl: "not-a-url" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "websiteUrl" })]),
    );
  });

  it("returns 400 with multiple field errors when several fields are invalid", async () => {
    const res = await request(server)
      .post("/api/blogs")
      .send({ description: "", name: "", websiteUrl: "nope" })
      .expect(400);

    const fields = (res.body.errorsMessages as Array<{ field: string }>).map(
      (entry) => entry.field,
    );
    expect(fields).toEqual(expect.arrayContaining(["name", "description", "websiteUrl"]));
  });
});

describe("Blogs API — PUT /api/blogs/:id", () => {
  it("updates the blog and returns 204; subsequent GET reflects the change", async () => {
    const id = await createBlogViaApi();
    const updated: BlogInput = {
      description: "Updated description",
      name: "Updated Name",
      websiteUrl: "https://updated.example.com",
    };

    await request(server).put(`/api/blogs/${id}`).send(updated).expect(204);

    const res = await request(server).get(`/api/blogs/${id}`).expect(200);
    expect(res.body).toMatchObject(updated);
  });

  it("returns 404 when the blog does not exist", async () => {
    await request(server).put("/api/blogs/999999").send(validBlog).expect(404);
  });

  it("returns 400 when the id is not a valid integer", async () => {
    await request(server).put("/api/blogs/not-a-number").send(validBlog).expect(400);
  });

  it("returns 400 when the body fails validation", async () => {
    const id = await createBlogViaApi();

    const res = await request(server)
      .put(`/api/blogs/${id}`)
      .send({ ...validBlog, name: "" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "name" })]),
    );
  });
});

describe("Blogs API — DELETE /api/blogs/:id", () => {
  it("deletes the blog and returns 204; subsequent GET returns 404", async () => {
    const id = await createBlogViaApi();

    await request(server).delete(`/api/blogs/${id}`).expect(204);
    await request(server).get(`/api/blogs/${id}`).expect(404);
  });

  it("returns 404 when the blog does not exist", async () => {
    await request(server).delete("/api/blogs/999999").expect(404);
  });

  it("returns 400 when the id is not a valid integer", async () => {
    await request(server).delete("/api/blogs/not-a-number").expect(400);
  });
});
