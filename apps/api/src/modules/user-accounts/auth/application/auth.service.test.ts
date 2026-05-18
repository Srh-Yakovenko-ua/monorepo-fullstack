import { ROLE } from "@app/shared";
import { hash } from "bcryptjs";
import { addHours, subHours, subSeconds } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserDoc } from "../../users/domain/user.entity.js";

import {
  BadRequestError,
  HttpError,
  UnauthorizedError,
} from "../../../../core/exceptions/errors.js";
import { HTTP_STATUS } from "../../../../core/http-status.js";
import { sendEmail } from "../../../../core/mailer.js";
import { SessionsRepository } from "../../security/infrastructure/sessions.repository.js";
import { UsersService } from "../../users/application/users.service.js";
import { UsersRepository } from "../../users/infrastructure/users.repository.js";
import { AuthService } from "./auth.service.js";

const PASSWORD_PLAINTEXT = "password123";
let passwordHashFixture: string;

type MockedSessionsRepository = {
  create: ReturnType<typeof vi.fn>;
  deleteByUserAndDevice: ReturnType<typeof vi.fn>;
  rotateSession: ReturnType<typeof vi.fn>;
};

type MockedUsersRepository = {
  atomicResetPassword: ReturnType<typeof vi.fn>;
  findByEmail: ReturnType<typeof vi.fn>;
  findByEmailConfirmationCode: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByLoginOrEmail: ReturnType<typeof vi.fn>;
  markEmailConfirmed: ReturnType<typeof vi.fn>;
  setPasswordRecovery: ReturnType<typeof vi.fn>;
  updateEmailConfirmation: ReturnType<typeof vi.fn>;
};

type MockedUsersService = {
  registerUser: ReturnType<typeof vi.fn>;
};

function buildService({
  sessionsRepository = buildSessionsRepository(),
  usersRepository = buildUsersRepository(),
  usersService = buildUsersService(),
}: {
  sessionsRepository?: MockedSessionsRepository;
  usersRepository?: MockedUsersRepository;
  usersService?: MockedUsersService;
} = {}): {
  service: AuthService;
  sessionsRepository: MockedSessionsRepository;
  usersRepository: MockedUsersRepository;
  usersService: MockedUsersService;
} {
  const service = new AuthService(
    usersService as unknown as UsersService,
    usersRepository as unknown as UsersRepository,
    sessionsRepository as unknown as SessionsRepository,
  );
  return { service, sessionsRepository, usersRepository, usersService };
}

function buildSessionsRepository(): MockedSessionsRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    deleteByUserAndDevice: vi.fn().mockResolvedValue(true),
    rotateSession: vi.fn().mockResolvedValue(undefined),
  };
}

function buildUserDoc(overrides: Partial<UserDoc> = {}): UserDoc {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "alice@example.com",
    emailConfirmationCode: null,
    emailConfirmationExpiresAt: null,
    emailIsConfirmed: true,
    id: 1,
    login: "alice",
    passwordHash: passwordHashFixture,
    passwordRecoveryCode: null,
    passwordRecoveryExpiresAt: null,
    role: ROLE.user,
    ...overrides,
  };
}

function buildUsersRepository(): MockedUsersRepository {
  return {
    atomicResetPassword: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailConfirmationCode: vi.fn(),
    findById: vi.fn(),
    findByLoginOrEmail: vi.fn(),
    markEmailConfirmed: vi.fn(),
    setPasswordRecovery: vi.fn(),
    updateEmailConfirmation: vi.fn(),
  };
}

function buildUsersService(): MockedUsersService {
  return { registerUser: vi.fn() };
}

const loginContext = { ip: "127.0.0.1", userAgent: undefined };

beforeEach(async () => {
  passwordHashFixture = await hash(PASSWORD_PLAINTEXT, 10);
});

describe("AuthService", () => {
  describe("register", () => {
    it("registers the user and sends a confirmation email", async () => {
      const usersService = buildUsersService();
      const registeredUser = buildUserDoc({
        email: "new@example.com",
        emailIsConfirmed: false,
        id: 99,
        login: "newbie",
      });
      usersService.registerUser.mockResolvedValue(registeredUser);

      const { service } = buildService({ usersService });

      await service.register({
        email: "new@example.com",
        login: "newbie",
        password: PASSWORD_PLAINTEXT,
      });

      expect(usersService.registerUser).toHaveBeenCalledWith({
        email: "new@example.com",
        emailConfirmation: {
          code: expect.any(String),
          expiresAt: expect.any(Date),
          isConfirmed: false,
        },
        login: "newbie",
        password: PASSWORD_PLAINTEXT,
      });

      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
      const sendEmailCall = vi.mocked(sendEmail).mock.calls[0]?.[0];
      expect(sendEmailCall?.to).toBe("new@example.com");
      expect(sendEmailCall?.subject).toBeDefined();
    });

    it("does not throw when sendEmail rejects (failure is logged)", async () => {
      const usersService = buildUsersService();
      usersService.registerUser.mockResolvedValue(buildUserDoc({ emailIsConfirmed: false }));
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));

      const { service } = buildService({ usersService });

      await expect(
        service.register({
          email: "a@example.com",
          login: "alice",
          password: PASSWORD_PLAINTEXT,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("confirmRegistration", () => {
    it("marks the user email as confirmed on a valid code", async () => {
      const usersRepository = buildUsersRepository();
      const user = buildUserDoc({
        emailConfirmationCode: "code-1",
        emailConfirmationExpiresAt: addHours(new Date(), 1),
        emailIsConfirmed: false,
        id: 42,
      });
      usersRepository.findByEmailConfirmationCode.mockResolvedValue(user);
      usersRepository.markEmailConfirmed.mockResolvedValue(undefined);

      const { service } = buildService({ usersRepository });

      await service.confirmRegistration({ code: "code-1" });

      expect(usersRepository.markEmailConfirmed).toHaveBeenCalledWith(42);
    });

    it("throws BadRequestError with field 'code' when the code is unknown", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmailConfirmationCode.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      const promise = service.confirmRegistration({ code: "missing" });

      await expect(promise).rejects.toBeInstanceOf(BadRequestError);
      await expect(promise).rejects.toMatchObject({
        fields: [expect.objectContaining({ field: "code" })],
      });
    });

    it("throws BadRequestError when the user email is already confirmed", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmailConfirmationCode.mockResolvedValue(
        buildUserDoc({ emailIsConfirmed: true }),
      );

      const { service } = buildService({ usersRepository });

      await expect(service.confirmRegistration({ code: "x" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });

    it("throws BadRequestError when the confirmation code has expired", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmailConfirmationCode.mockResolvedValue(
        buildUserDoc({
          emailConfirmationCode: "x",
          emailConfirmationExpiresAt: subHours(new Date(), 1),
          emailIsConfirmed: false,
        }),
      );

      const { service } = buildService({ usersRepository });

      await expect(service.confirmRegistration({ code: "x" })).rejects.toBeInstanceOf(
        BadRequestError,
      );
    });
  });

  describe("login", () => {
    it("returns access + refresh tokens and creates a session on success", async () => {
      const usersRepository = buildUsersRepository();
      const sessionsRepository = buildSessionsRepository();
      const user = buildUserDoc({ id: 11 });
      usersRepository.findByLoginOrEmail.mockResolvedValue(user);

      const { service } = buildService({ sessionsRepository, usersRepository });

      const result = await service.login(
        { loginOrEmail: "alice", password: PASSWORD_PLAINTEXT },
        { ip: "203.0.113.10", userAgent: "Mozilla/5.0 (Macintosh)" },
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshExpiresAt).toBeInstanceOf(Date);

      expect(sessionsRepository.create).toHaveBeenCalledTimes(1);
      expect(sessionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: expect.any(String),
          expiresAt: expect.any(Date),
          ip: "203.0.113.10",
          lastActiveAt: expect.any(Date),
          title: expect.any(String),
          tokenJti: expect.any(String),
          userId: 11,
        }),
      );
    });

    it("throws UnauthorizedError when the user is not found", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByLoginOrEmail.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      await expect(
        service.login({ loginOrEmail: "nope", password: PASSWORD_PLAINTEXT }, loginContext),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("throws UnauthorizedError when the password does not match", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByLoginOrEmail.mockResolvedValue(buildUserDoc());

      const { service } = buildService({ usersRepository });

      await expect(
        service.login({ loginOrEmail: "alice", password: "wrong-password" }, loginContext),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("throws UnauthorizedError when the email is not yet confirmed", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByLoginOrEmail.mockResolvedValue(
        buildUserDoc({ emailIsConfirmed: false }),
      );

      const { service } = buildService({ usersRepository });

      await expect(
        service.login({ loginOrEmail: "alice", password: PASSWORD_PLAINTEXT }, loginContext),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("logout", () => {
    it("deletes the session for the given user + device", async () => {
      const sessionsRepository = buildSessionsRepository();
      const { service } = buildService({ sessionsRepository });

      await service.logout({ deviceId: "device-1", userId: 7 });

      expect(sessionsRepository.deleteByUserAndDevice).toHaveBeenCalledWith({
        deviceId: "device-1",
        userId: 7,
      });
    });
  });

  describe("refreshTokens", () => {
    it("rotates the session and returns new tokens", async () => {
      const sessionsRepository = buildSessionsRepository();
      const { service } = buildService({ sessionsRepository });

      const result = await service.refreshTokens(
        { deviceId: "device-1", userId: 7 },
        { ip: "203.0.113.10", userAgent: undefined },
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshExpiresAt).toBeInstanceOf(Date);

      expect(sessionsRepository.rotateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "device-1",
          expiresAt: expect.any(Date),
          ip: "203.0.113.10",
          lastActiveAt: expect.any(Date),
          tokenJti: expect.any(String),
          userId: 7,
        }),
      );
    });
  });

  describe("requestPasswordRecovery", () => {
    it("stores a recovery code and dispatches an email for an existing user", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(buildUserDoc({ id: 5 }));
      usersRepository.setPasswordRecovery.mockResolvedValue(undefined);

      const { service } = buildService({ usersRepository });

      await service.requestPasswordRecovery({ email: "alice@example.com" });

      expect(usersRepository.setPasswordRecovery).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
          expiresAt: expect.any(Date),
          userId: 5,
        }),
      );

      await vi.waitFor(() => {
        expect(vi.mocked(sendEmail)).toHaveBeenCalled();
      });
    });

    it("returns silently for an unknown email without calling the mailer", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      await service.requestPasswordRecovery({ email: "ghost@example.com" });

      expect(usersRepository.setPasswordRecovery).not.toHaveBeenCalled();
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    });

    it("throttles repeated requests within the cooldown window", async () => {
      const usersRepository = buildUsersRepository();
      const now = new Date();
      usersRepository.findByEmail.mockResolvedValue(
        buildUserDoc({ passwordRecoveryExpiresAt: addHours(subSeconds(now, 5), 1) }),
      );

      const { service } = buildService({ usersRepository });

      await service.requestPasswordRecovery({ email: "alice@example.com" });

      expect(usersRepository.setPasswordRecovery).not.toHaveBeenCalled();
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    });
  });

  describe("confirmPasswordRecovery", () => {
    it("updates the password atomically on a valid recovery code", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.atomicResetPassword.mockResolvedValue(buildUserDoc());

      const { service } = buildService({ usersRepository });

      await service.confirmPasswordRecovery({
        newPassword: "brand-new-pw",
        recoveryCode: "recovery-1",
      });

      expect(usersRepository.atomicResetPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          newPasswordHash: expect.any(String),
          now: expect.any(Date),
          recoveryCode: "recovery-1",
        }),
      );
    });

    it("throws BadRequestError with field 'recoveryCode' when no user matches", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.atomicResetPassword.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      const promise = service.confirmPasswordRecovery({
        newPassword: "brand-new-pw",
        recoveryCode: "bad",
      });

      await expect(promise).rejects.toBeInstanceOf(BadRequestError);
      await expect(promise).rejects.toMatchObject({
        fields: [expect.objectContaining({ field: "recoveryCode" })],
      });
    });
  });

  describe("resendConfirmationEmail", () => {
    it("updates the confirmation code and resends the email when the user exists", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(
        buildUserDoc({ emailIsConfirmed: false, id: 17 }),
      );
      usersRepository.updateEmailConfirmation.mockResolvedValue(undefined);

      const { service } = buildService({ usersRepository });

      await service.resendConfirmationEmail({ email: "alice@example.com" });

      expect(usersRepository.updateEmailConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
          expiresAt: expect.any(Date),
          isConfirmed: false,
          userId: 17,
        }),
      );
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    });

    it("throws BadRequestError when the email is not registered", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      await expect(
        service.resendConfirmationEmail({ email: "ghost@example.com" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("throws BadRequestError when the email is already confirmed", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(buildUserDoc({ emailIsConfirmed: true }));

      const { service } = buildService({ usersRepository });

      await expect(
        service.resendConfirmationEmail({ email: "alice@example.com" }),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("throws HttpError with BAD_GATEWAY when sending the email fails", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findByEmail.mockResolvedValue(buildUserDoc({ emailIsConfirmed: false }));
      usersRepository.updateEmailConfirmation.mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error("smtp down"));

      const { service } = buildService({ usersRepository });

      const promise = service.resendConfirmationEmail({ email: "alice@example.com" });
      await expect(promise).rejects.toBeInstanceOf(HttpError);
      await expect(promise).rejects.toMatchObject({ status: HTTP_STATUS.BAD_GATEWAY });
    });
  });

  describe("getCurrentUser", () => {
    it("returns the MeViewModel shape for an existing user", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findById.mockResolvedValue(buildUserDoc({ id: 33 }));

      const { service } = buildService({ usersRepository });

      const me = await service.getCurrentUser(33);

      expect(me).toEqual({
        email: "alice@example.com",
        login: "alice",
        role: ROLE.user,
        userId: 33,
      });
    });

    it("throws UnauthorizedError when the user is not found", async () => {
      const usersRepository = buildUsersRepository();
      usersRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ usersRepository });

      await expect(service.getCurrentUser(999)).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
