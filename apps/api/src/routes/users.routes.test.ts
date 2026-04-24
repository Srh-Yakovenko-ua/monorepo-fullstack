import type { UserViewModel } from "@app/shared";

import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { UserModel } from "../db/models/user.model.js";
import {
  createAdminAndLogin,
  createSuperAdminAndLogin,
  createUserAndLogin,
} from "../test/auth-helpers.js";

const app = createApp();

const validUser = {
  email: "john@example.dev",
  login: "john",
  password: "password1",
};

const createUserViaApi = async (adminToken: string, override: Partial<typeof validUser> = {}) =>
  request(app)
    .post("/api/users")
    .set("authorization", `Bearer ${adminToken}`)
    .send({ ...validUser, ...override });

describe("Users API", () => {
  describe("GET /api/users", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("authorization", "Bearer garbage.token.value");

      expect(res.status).toBe(401);
    });

    it("returns 403 with user-level token", async () => {
      const userToken = await createUserAndLogin(app, {
        email: "user@example.dev",
        login: "regularuser",
        password: "password1",
      });

      const res = await request(app).get("/api/users").set("authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 200 with paginator containing only the seed admin when no extra users exist", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(app).get("/api/users").set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.pagesCount).toBe(1);
      expect(res.body.items).toHaveLength(1);
    });

    it("returns 200 with paginator containing two items after creating one extra user", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken);

      const res = await request(app).get("/api/users").set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.pagesCount).toBe(1);
    });

    it("respects pageNumber and pageSize", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken, { email: "a@example.dev", login: "usera" });
      await createUserViaApi(adminToken, { email: "b@example.dev", login: "userb" });
      await createUserViaApi(adminToken, { email: "c@example.dev", login: "userc" });
      await createUserViaApi(adminToken, { email: "d@example.dev", login: "userd" });

      const res = await request(app)
        .get("/api/users?pageSize=3&pageNumber=2")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(3);
      expect(res.body.totalCount).toBe(5);
      expect(res.body.pagesCount).toBe(2);
      expect(res.body.items).toHaveLength(2);
    });

    it("filters by searchLoginTerm case-insensitively", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken, { email: "alice@example.dev", login: "alice" });
      await createUserViaApi(adminToken, { email: "bob@example.dev", login: "bob" });

      const res = await request(app)
        .get("/api/users?searchLoginTerm=ALICE")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].login).toBe("alice");
    });

    it("filters by searchEmailTerm case-insensitively", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken, { email: "charlie@example.dev", login: "charlie" });
      await createUserViaApi(adminToken, { email: "dave@other.dev", login: "dave" });

      const res = await request(app)
        .get("/api/users?searchEmailTerm=EXAMPLE")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].login).toBe("charlie");
    });

    it("OR-combines searchLoginTerm and searchEmailTerm", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken, { email: "eva@example.dev", login: "eva" });
      await createUserViaApi(adminToken, { email: "frank@special.dev", login: "frank" });
      await createUserViaApi(adminToken, { email: "grace@other.dev", login: "grace" });

      const res = await request(app)
        .get("/api/users?searchLoginTerm=eva&searchEmailTerm=special")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(2);

      const logins: string[] = res.body.items.map((userItem: UserViewModel) => userItem.login);
      expect(logins).toContain("eva");
      expect(logins).toContain("frank");
    });

    it("sorts by login ascending", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken, { email: "zebra@example.dev", login: "zebra" });
      await createUserViaApi(adminToken, { email: "apple@example.dev", login: "apple" });

      const res = await request(app)
        .get("/api/users?sortBy=login&sortDirection=asc")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items[0].login).toBe("apple");
      expect(res.body.items[2].login).toBe("zebra");
    });

    it("view model contains id, login, email, createdAt and no password fields", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken);

      const res = await request(app).get("/api/users").set("authorization", `Bearer ${adminToken}`);

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

    it("returns 403 with user-level token", async () => {
      const userToken = await createUserAndLogin(app, {
        email: "user@example.dev",
        login: "regularuser",
        password: "password1",
      });

      const res = await request(app)
        .post("/api/users")
        .set("authorization", `Bearer ${userToken}`)
        .send(validUser);

      expect(res.status).toBe(403);
    });

    it("returns 201 with view model on valid body", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken);

      expect(res.status).toBe(201);
      expect(typeof res.body.id).toBe("string");
      expect(res.body.login).toBe(validUser.login);
      expect(res.body.email).toBe(validUser.email);
      expect(typeof res.body.createdAt).toBe("string");
    });

    it("response body does not contain password or passwordHash", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken);

      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("stores a bcrypt hash in the database", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken);

      expect(res.status).toBe(201);

      const stored = await mongoose.connection
        .collection("users")
        .findOne({ login: validUser.login });

      expect(stored).not.toBeNull();
      expect(typeof stored?.passwordHash).toBe("string");
      expect((stored?.passwordHash as string).startsWith("$2")).toBe(true);
    });

    it("returns 400 when login is too short", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { login: "ab" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when login is too long", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { login: "a".repeat(11) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when login contains invalid characters", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { login: "bad!name" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 when password is too short", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { password: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "password" })]),
      );
    });

    it("returns 400 when password is too long", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { password: "a".repeat(21) });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "password" })]),
      );
    });

    it("returns 400 when email does not match the required pattern", async () => {
      const adminToken = await createAdminAndLogin(app);
      const res = await createUserViaApi(adminToken, { email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "email" })]),
      );
    });

    it("returns 400 with login field error on duplicate login", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken);

      const res = await createUserViaApi(adminToken, { email: "other@example.dev" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "login" })]),
      );
    });

    it("returns 400 with email field error on duplicate email", async () => {
      const adminToken = await createAdminAndLogin(app);
      await createUserViaApi(adminToken);

      const res = await createUserViaApi(adminToken, { login: "other" });

      expect(res.status).toBe(400);
      expect(res.body.errorsMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "email" })]),
      );
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("returns 401 without auth", async () => {
      const adminToken = await createAdminAndLogin(app);
      const created = await createUserViaApi(adminToken);
      const id: string = created.body.id;

      const res = await request(app).delete(`/api/users/${id}`);

      expect(res.status).toBe(401);
    });

    it("returns 403 with user-level token", async () => {
      const adminToken = await createAdminAndLogin(app);
      const created = await createUserViaApi(adminToken);
      const id: string = created.body.id;

      const userToken = await createUserAndLogin(app, {
        email: "user2@example.dev",
        login: "regularuser2",
        password: "password1",
      });

      const res = await request(app)
        .delete(`/api/users/${id}`)
        .set("authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it("returns 204 on existing user and 404 on the same id afterwards", async () => {
      const adminToken = await createAdminAndLogin(app);
      const created = await createUserViaApi(adminToken);
      const id: string = created.body.id;

      const deleteRes = await request(app)
        .delete(`/api/users/${id}`)
        .set("authorization", `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(204);

      const secondDeleteRes = await request(app)
        .delete(`/api/users/${id}`)
        .set("authorization", `Bearer ${adminToken}`);

      expect(secondDeleteRes.status).toBe(404);
    });

    it("returns 404 for a valid ObjectId that does not exist", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(app)
        .delete("/api/users/000000000000000000000000")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("returns 404 for a malformed id", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(app)
        .delete("/api/users/not-an-id")
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("returns 400 when trying to delete a super-admin", async () => {
      const { token: superToken, userId: superAdminId } = await createSuperAdminAndLogin(app);

      const adminToken = await createAdminAndLogin(app);

      const res = await request(app)
        .delete(`/api/users/${superAdminId}`)
        .set("authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);

      void superToken;
    });
  });

  describe("PUT /api/users/:id/role", () => {
    it("returns 401 without token", async () => {
      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .send({ role: "admin" });

      expect(res.status).toBe(401);
    });

    it("returns 403 with user-level token", async () => {
      const userToken = await createUserAndLogin(app, {
        email: "roleuser@example.dev",
        login: "roleuser",
        password: "password1",
      });

      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .set("authorization", `Bearer ${userToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(403);
    });

    it("returns 403 with regular admin token", async () => {
      const adminToken = await createAdminAndLogin(app);

      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .set("authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(403);
    });

    it("returns 204 when super-admin promotes user to admin then demotes back", async () => {
      const { token: superToken } = await createSuperAdminAndLogin(app);
      const adminToken = await createAdminAndLogin(app);
      const created = await createUserViaApi(adminToken);
      const userId: string = created.body.id;

      const promoteRes = await request(app)
        .put(`/api/users/${userId}/role`)
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "admin" });

      expect(promoteRes.status).toBe(204);

      const demoteRes = await request(app)
        .put(`/api/users/${userId}/role`)
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "user" });

      expect(demoteRes.status).toBe(204);
    });

    it("returns 400 when super-admin tries to change own role", async () => {
      const { token: superToken, userId: superAdminId } = await createSuperAdminAndLogin(app);

      const res = await request(app)
        .put(`/api/users/${superAdminId}/role`)
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when targeting another super-admin", async () => {
      const { token: superToken } = await createSuperAdminAndLogin(app);

      const anotherSuperAdmin = await UserModel.create({
        email: "super2@test.dev",
        emailConfirmation: { code: null, expiresAt: null, isConfirmed: true },
        login: "superadmin2",
        passwordHash: "irrelevant",
        role: "superAdmin",
      });

      const res = await request(app)
        .put(`/api/users/${anotherSuperAdmin._id.toHexString()}/role`)
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid body role value", async () => {
      const { token: superToken } = await createSuperAdminAndLogin(app);

      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "foo" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when trying to assign superAdmin role via API", async () => {
      const { token: superToken } = await createSuperAdminAndLogin(app);

      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "superAdmin" });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent user id", async () => {
      const { token: superToken } = await createSuperAdminAndLogin(app);

      const res = await request(app)
        .put("/api/users/000000000000000000000000/role")
        .set("authorization", `Bearer ${superToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(404);
    });
  });
});
