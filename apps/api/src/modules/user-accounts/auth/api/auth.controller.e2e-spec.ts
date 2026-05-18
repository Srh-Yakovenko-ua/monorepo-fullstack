import type { CreateUserInput } from "@app/shared";
import type { INestApplication } from "@nestjs/common";

import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "../../../../core/mailer.js";
import { createTestApp } from "../../../../test/create-test-app.js";
import { truncateAllTables } from "../../../../test/truncate.js";
import { SessionEntity } from "../../security/domain/session.entity.js";
import { UserAccountsModule } from "../../user-accounts.module.js";
import { UserEntity } from "../../users/domain/user.entity.js";

const ALLOWED_ORIGIN = "http://localhost:5173";
const AUTH_THROTTLE_LIMIT = 5;

let app: INestApplication;
let server: ReturnType<INestApplication["getHttpServer"]>;
let userRepo: Repository<UserEntity>;
let sessionRepo: Repository<SessionEntity>;

const validRegistration: CreateUserInput = {
  email: "alice@example.com",
  login: "alice",
  password: "Pa55word!",
};

function extractRefreshCookie(res: request.Response): string {
  const setCookieHeader = res.headers["set-cookie"];
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : typeof setCookieHeader === "string"
      ? [setCookieHeader]
      : [];
  const cookie = cookies.find((entry) => entry.startsWith("refreshToken="));
  if (!cookie) throw new Error("refreshToken cookie not found in response");
  return cookie.split(";")[0] ?? "";
}

async function loginUser({
  loginOrEmail = validRegistration.email,
  password = validRegistration.password,
}: { loginOrEmail?: string; password?: string } = {}): Promise<{
  accessToken: string;
  refreshCookie: string;
}> {
  const res = await request(server)
    .post("/api/auth/login")
    .set("origin", ALLOWED_ORIGIN)
    .send({ loginOrEmail, password })
    .expect(200);
  return {
    accessToken: res.body.accessToken as string,
    refreshCookie: extractRefreshCookie(res),
  };
}

async function registerAndConfirm(input: CreateUserInput = validRegistration): Promise<void> {
  await request(server).post("/api/auth/registration").send(input).expect(204);
  const user = await userRepo.findOneBy({ email: input.email });
  if (!user?.emailConfirmationCode) throw new Error("confirmation code missing after registration");
  await request(server)
    .post("/api/auth/registration-confirmation")
    .send({ code: user.emailConfirmationCode })
    .expect(204);
}

beforeAll(async () => {
  app = await createTestApp([UserAccountsModule]);
  server = app.getHttpServer();
  userRepo = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  sessionRepo = app.get<Repository<SessionEntity>>(getRepositoryToken(SessionEntity));
});

beforeEach(async () => {
  await truncateAllTables(app);
});

afterAll(async () => {
  await app.close();
});

describe("Auth API — registration + confirmation", () => {
  it("POST /api/auth/registration creates a user and dispatches the confirmation email", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);

    const user = await userRepo.findOneBy({ email: validRegistration.email });
    expect(user).not.toBeNull();
    expect(user?.emailIsConfirmed).toBe(false);
    expect(user?.emailConfirmationCode).toEqual(expect.any(String));
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("POST /api/auth/registration returns 400 with field 'login' on duplicate login", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);

    const res = await request(server)
      .post("/api/auth/registration")
      .send({ ...validRegistration, email: "alice2@example.com" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "login" })]),
    );
  });

  it("POST /api/auth/registration returns 400 with field 'email' on duplicate email", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);

    const res = await request(server)
      .post("/api/auth/registration")
      .send({ ...validRegistration, login: "bob" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });

  it("POST /api/auth/registration returns 400 with field 'email' when the email is malformed", async () => {
    const res = await request(server)
      .post("/api/auth/registration")
      .send({ ...validRegistration, email: "not-an-email" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });

  it("POST /api/auth/registration returns 400 with field 'password' when the password is too short", async () => {
    const res = await request(server)
      .post("/api/auth/registration")
      .send({ ...validRegistration, password: "abc" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "password" })]),
    );
  });

  it("POST /api/auth/registration returns 400 with field 'login' when the login is too short", async () => {
    const res = await request(server)
      .post("/api/auth/registration")
      .send({ ...validRegistration, login: "a" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "login" })]),
    );
  });

  it("POST /api/auth/registration-confirmation confirms the email on a valid code", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);
    const created = await userRepo.findOneBy({ email: validRegistration.email });
    const code = created?.emailConfirmationCode ?? "";

    await request(server).post("/api/auth/registration-confirmation").send({ code }).expect(204);

    const confirmed = await userRepo.findOneBy({ email: validRegistration.email });
    expect(confirmed?.emailIsConfirmed).toBe(true);
    expect(confirmed?.emailConfirmationCode).toBeNull();
  });

  it("POST /api/auth/registration-confirmation returns 400 with field 'code' on unknown code", async () => {
    const res = await request(server)
      .post("/api/auth/registration-confirmation")
      .send({ code: "not-a-real-code" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "code" })]),
    );
  });

  it("POST /api/auth/registration-confirmation returns 400 when the email is already confirmed", async () => {
    await registerAndConfirm();
    const created = await userRepo.findOneBy({ email: validRegistration.email });

    const res = await request(server)
      .post("/api/auth/registration-confirmation")
      .send({ code: created?.emailConfirmationCode ?? "anything" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "code" })]),
    );
  });

  it("POST /api/auth/registration-email-resending resends the email for an unconfirmed user", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);
    vi.mocked(sendEmail).mockClear();

    await request(server)
      .post("/api/auth/registration-email-resending")
      .send({ email: validRegistration.email })
      .expect(204);

    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("POST /api/auth/registration-email-resending returns 400 when the email is already confirmed", async () => {
    await registerAndConfirm();

    const res = await request(server)
      .post("/api/auth/registration-email-resending")
      .send({ email: validRegistration.email })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });

  it("POST /api/auth/registration-email-resending returns 400 when the email is unknown", async () => {
    const res = await request(server)
      .post("/api/auth/registration-email-resending")
      .send({ email: "ghost@example.com" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });
});

describe("Auth API — login, me, refresh, logout", () => {
  it("POST /api/auth/login returns an accessToken + sets HttpOnly refresh cookie", async () => {
    await registerAndConfirm();

    const res = await request(server)
      .post("/api/auth/login")
      .set("origin", ALLOWED_ORIGIN)
      .send({ loginOrEmail: validRegistration.email, password: validRegistration.password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookieHeader = res.headers["set-cookie"];
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const refreshCookie = cookies.find(
      (entry): entry is string => typeof entry === "string" && entry.startsWith("refreshToken="),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  it("POST /api/auth/login returns 401 when the email is not yet confirmed", async () => {
    await request(server).post("/api/auth/registration").send(validRegistration).expect(204);

    await request(server)
      .post("/api/auth/login")
      .send({ loginOrEmail: validRegistration.email, password: validRegistration.password })
      .expect(401);
  });

  it("POST /api/auth/login returns 401 when the password is wrong", async () => {
    await registerAndConfirm();

    await request(server)
      .post("/api/auth/login")
      .send({ loginOrEmail: validRegistration.email, password: "wrong-password" })
      .expect(401);
  });

  it("POST /api/auth/login returns 401 when the user does not exist", async () => {
    await request(server)
      .post("/api/auth/login")
      .send({ loginOrEmail: "ghost@example.com", password: "whatever" })
      .expect(401);
  });

  it("GET /api/auth/me returns 401 without a bearer token", async () => {
    await request(server).get("/api/auth/me").expect(401);
  });

  it("GET /api/auth/me returns the current user when a valid bearer is provided", async () => {
    await registerAndConfirm();
    const { accessToken } = await loginUser();

    const res = await request(server)
      .get("/api/auth/me")
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      email: validRegistration.email,
      login: validRegistration.login,
      role: "user",
      userId: expect.any(Number),
    });
  });

  it("POST /api/auth/refresh-token rotates the refresh cookie and returns a new accessToken", async () => {
    await registerAndConfirm();
    const { refreshCookie } = await loginUser();

    const res = await request(server)
      .post("/api/auth/refresh-token")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", refreshCookie)
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    const newRefreshCookie = extractRefreshCookie(res);
    expect(newRefreshCookie).not.toBe(refreshCookie);
  });

  it("POST /api/auth/refresh-token returns 401 when no cookie is sent", async () => {
    await request(server).post("/api/auth/refresh-token").set("origin", ALLOWED_ORIGIN).expect(401);
  });

  it("POST /api/auth/refresh-token returns 401 and deletes the session when a rotated refresh is reused", async () => {
    await registerAndConfirm();
    const { refreshCookie } = await loginUser();

    await request(server)
      .post("/api/auth/refresh-token")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", refreshCookie)
      .expect(200);

    await request(server)
      .post("/api/auth/refresh-token")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", refreshCookie)
      .expect(401);

    const remainingSessions = await sessionRepo.count();
    expect(remainingSessions).toBe(0);
  });

  it("POST /api/auth/logout clears the cookie and deletes the session", async () => {
    await registerAndConfirm();
    const { refreshCookie } = await loginUser();
    expect(await sessionRepo.count()).toBe(1);

    const res = await request(server)
      .post("/api/auth/logout")
      .set("origin", ALLOWED_ORIGIN)
      .set("cookie", refreshCookie)
      .expect(204);

    const cookieHeader = res.headers["set-cookie"];
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const clearedCookie = cookies.find(
      (entry): entry is string => typeof entry === "string" && entry.startsWith("refreshToken="),
    );
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toMatch(/refreshToken=;/);

    expect(await sessionRepo.count()).toBe(0);
  });

  it("POST /api/auth/logout returns 401 without a refresh cookie", async () => {
    await request(server).post("/api/auth/logout").set("origin", ALLOWED_ORIGIN).expect(401);
  });
});

describe("Auth API — password recovery", () => {
  it("POST /api/auth/password-recovery stores a recovery code for an existing user", async () => {
    await registerAndConfirm();

    await request(server)
      .post("/api/auth/password-recovery")
      .send({ email: validRegistration.email })
      .expect(204);

    await vi.waitFor(async () => {
      const user = await userRepo.findOneBy({ email: validRegistration.email });
      expect(user?.passwordRecoveryCode).toEqual(expect.any(String));
    });
  });

  it("POST /api/auth/password-recovery returns 204 silently for an unknown email", async () => {
    await request(server)
      .post("/api/auth/password-recovery")
      .send({ email: "ghost@example.com" })
      .expect(204);

    const count = await userRepo.count();
    expect(count).toBe(0);
  });

  it("POST /api/auth/password-recovery throttles repeated requests for the same email", async () => {
    await registerAndConfirm();

    await request(server)
      .post("/api/auth/password-recovery")
      .send({ email: validRegistration.email })
      .expect(204);

    await vi.waitFor(async () => {
      const after = await userRepo.findOneBy({ email: validRegistration.email });
      expect(after?.passwordRecoveryCode).toEqual(expect.any(String));
    });

    const firstUser = await userRepo.findOneBy({ email: validRegistration.email });
    const firstCode = firstUser?.passwordRecoveryCode;

    await request(server)
      .post("/api/auth/password-recovery")
      .send({ email: validRegistration.email })
      .expect(204);

    const second = await userRepo.findOneBy({ email: validRegistration.email });
    expect(second?.passwordRecoveryCode).toBe(firstCode);
  });

  it("POST /api/auth/new-password updates the password using a valid recovery code", async () => {
    await registerAndConfirm();
    await request(server)
      .post("/api/auth/password-recovery")
      .send({ email: validRegistration.email })
      .expect(204);

    await vi.waitFor(async () => {
      const user = await userRepo.findOneBy({ email: validRegistration.email });
      expect(user?.passwordRecoveryCode).toEqual(expect.any(String));
    });

    const user = await userRepo.findOneBy({ email: validRegistration.email });
    const recoveryCode = user?.passwordRecoveryCode ?? "";
    const newPassword = "NewPass123!";

    await request(server)
      .post("/api/auth/new-password")
      .send({ newPassword, recoveryCode })
      .expect(204);

    await request(server)
      .post("/api/auth/login")
      .set("origin", ALLOWED_ORIGIN)
      .send({ loginOrEmail: validRegistration.email, password: newPassword })
      .expect(200);
  });

  it("POST /api/auth/new-password returns 400 with field 'recoveryCode' when the code is invalid", async () => {
    const res = await request(server)
      .post("/api/auth/new-password")
      .send({ newPassword: "Whatever123", recoveryCode: "not-a-real-code" })
      .expect(400);

    expect(res.body.errorsMessages).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "recoveryCode" })]),
    );
  });
});

describe("Auth API — rate limiting via AuthThrottlerGuard", () => {
  it("returns 429 after exceeding the per-window login attempt limit", async () => {
    for (let attempt = 0; attempt < AUTH_THROTTLE_LIMIT; attempt += 1) {
      await request(server)
        .post("/api/auth/login")
        .send({ loginOrEmail: "ghost@example.com", password: "whatever" })
        .expect(401);
    }

    await request(server)
      .post("/api/auth/login")
      .send({ loginOrEmail: "ghost@example.com", password: "whatever" })
      .expect(429);
  });
});
