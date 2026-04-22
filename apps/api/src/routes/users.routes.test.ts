import type { UserViewModel } from "@app/shared";

import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const app = createApp();

const validUser = {
  email: "john@example.dev",
  login: "john",
  password: "password1",
};

const createUserViaApi = async (override: Partial<typeof validUser> = {}) =>
  request(app)
    .post("/api/users")
    .auth("admin", "qwerty")
    .send({ ...validUser, ...override });

describe("Users API", () => {
  describe("GET /api/users", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong credentials", async () => {
      const res = await request(app).get("/api/users").auth("admin", "wrong");

      expect(res.status).toBe(401);
    });

    it("returns 200 with empty paginator when no users exist", async () => {
      const res = await request(app).get("/api/users").auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        pagesCount: 0,
        pageSize: 10,
        totalCount: 0,
      });
    });

    it("returns 200 with paginator containing one item after creating a user", async () => {
      await createUserViaApi();

      const res = await request(app).get("/api/users").auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.pagesCount).toBe(1);
    });

    it("respects pageNumber and pageSize", async () => {
      await createUserViaApi({ email: "a@example.dev", login: "usera" });
      await createUserViaApi({ email: "b@example.dev", login: "userb" });
      await createUserViaApi({ email: "c@example.dev", login: "userc" });
      await createUserViaApi({ email: "d@example.dev", login: "userd" });

      const res = await request(app)
        .get("/api/users?pageSize=2&pageNumber=2")
        .auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(2);
      expect(res.body.totalCount).toBe(4);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(2);
    });

    it("filters by searchLoginTerm case-insensitively", async () => {
      await createUserViaApi({ email: "alice@example.dev", login: "alice" });
      await createUserViaApi({ email: "bob@example.dev", login: "bob" });

      const res = await request(app)
        .get("/api/users?searchLoginTerm=ALICE")
        .auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].login).toBe("alice");
    });

    it("filters by searchEmailTerm case-insensitively", async () => {
      await createUserViaApi({ email: "charlie@example.dev", login: "charlie" });
      await createUserViaApi({ email: "dave@other.dev", login: "dave" });

      const res = await request(app)
        .get("/api/users?searchEmailTerm=EXAMPLE")
        .auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].login).toBe("charlie");
    });

    it("OR-combines searchLoginTerm and searchEmailTerm", async () => {
      await createUserViaApi({ email: "eva@example.dev", login: "eva" });
      await createUserViaApi({ email: "frank@special.dev", login: "frank" });
      await createUserViaApi({ email: "grace@other.dev", login: "grace" });

      const res = await request(app)
        .get("/api/users?searchLoginTerm=eva&searchEmailTerm=special")
        .auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(2);

      const logins: string[] = res.body.items.map((userItem: UserViewModel) => userItem.login);
      expect(logins).toContain("eva");
      expect(logins).toContain("frank");
    });

    it("sorts by login ascending", async () => {
      await createUserViaApi({ email: "zebra@example.dev", login: "zebra" });
      await createUserViaApi({ email: "apple@example.dev", login: "apple" });

      const res = await request(app)
        .get("/api/users?sortBy=login&sortDirection=asc")
        .auth("admin", "qwerty");

      expect(res.status).toBe(200);
      expect(res.body.items[0].login).toBe("apple");
      expect(res.body.items[1].login).toBe("zebra");
    });

    it("view model contains id, login, email, createdAt and no password fields", async () => {
      await createUserViaApi();

      const res = await request(app).get("/api/users").auth("admin", "qwerty");

      expect(res.status).toBe(200);
      const userItem: UserViewModel = res.body.items[0];
      expect(typeof userItem.id).toBe("string");
      expect(typeof userItem.login).toBe("string");
      expect(typeof userItem.email).toBe("string");
      expect(typeof userItem.createdAt).toBe("string");
      expect(userItem).not.toHaveProperty("password");
      expect(userItem).not.toHaveProperty("passwordHash");
    });
  });

  describe("POST /api/users", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).post("/api/users").send(validUser);

      expect(res.status).toBe(401);
    });

    it("returns 201 with view model on valid body", async () => {
      const res = await createUserViaApi();

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.login).toBe(validUser.login);
      expect(res.body.email).toBe(validUser.email);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("response body does not contain password or passwordHash", async () => {
      const res = await createUserViaApi();

      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("stores a bcrypt hash in the database", async () => {
      const res = await createUserViaApi();

      expect(res.status).toBe(201);

      const stored = await mongoose.connection
        .collection("users")
        .findOne({ login: validUser.login });

      expect(stored).not.toBeNull();
      expect(typeof stored?.passwordHash).toBe("string");
      expect((stored?.passwordHash as string).startsWith("$2")).toBe(true);
    });

    it("returns 400 when login is too short", async () => {
      const res = await createUserViaApi({ login: "ab" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when login is too long", async () => {
      const res = await createUserViaApi({ login: "a".repeat(11) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when login contains invalid characters", async () => {
      const res = await createUserViaApi({ login: "bad!name" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when password is too short", async () => {
      const res = await createUserViaApi({ password: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "password" })]),
      );
    });

    it("returns 400 when password is too long", async () => {
      const res = await createUserViaApi({ password: "a".repeat(21) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "password" })]),
      );
    });

    it("returns 400 when email does not match the required pattern", async () => {
      const res = await createUserViaApi({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "email" })]),
      );
    });

    it("returns 400 with login field error on duplicate login", async () => {
      await createUserViaApi();

      const res = await createUserViaApi({ email: "other@example.dev" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 with email field error on duplicate email", async () => {
      await createUserViaApi();

      const res = await createUserViaApi({ login: "other" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "email" })]),
      );
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("returns 401 without auth", async () => {
      const created = await createUserViaApi();
      const id: string = created.body.id;

      const res = await request(app).delete(`/api/users/${id}`);

      expect(res.status).toBe(401);
    });

    it("returns 204 on existing user and 404 on the same id afterwards", async () => {
      const created = await createUserViaApi();
      const id: string = created.body.id;

      const deleteRes = await request(app).delete(`/api/users/${id}`).auth("admin", "qwerty");

      expect(deleteRes.status).toBe(204);

      const secondDeleteRes = await request(app).delete(`/api/users/${id}`).auth("admin", "qwerty");

      expect(secondDeleteRes.status).toBe(404);
    });

    it("returns 404 for a valid ObjectId that does not exist", async () => {
      const res = await request(app)
        .delete("/api/users/000000000000000000000000")
        .auth("admin", "qwerty");

      expect(res.status).toBe(404);
    });

    it("returns 404 for a malformed id", async () => {
      const res = await request(app).delete("/api/users/not-an-id").auth("admin", "qwerty");

      expect(res.status).toBe(404);
    });
  });
});
