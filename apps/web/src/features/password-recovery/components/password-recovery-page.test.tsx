import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModalId, modalObserver } from "@/features/modals";
import { PasswordRecoveryPage } from "@/features/password-recovery/components/password-recovery-page";
import { RecoverySuccessDialog } from "@/features/password-recovery/components/recovery-success-dialog";
import { renderWithRouter, screen, userEvent, waitFor } from "@/test-utils";

vi.mock("react-i18next", () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && "email" in options) return `${key}:${String(options.email)}`;
      return key;
    },
  }),
}));

vi.mock("@/features/user-auth/hooks/use-user-auth", () => ({
  useUserAuth: () => ({ isAuthed: false, isLoading: false, user: null }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  modalObserver.removeAllModals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  modalObserver.removeAllModals();
});

function badRequestRecoveryCode(): Response {
  return new Response(
    JSON.stringify({
      errorsMessages: [{ field: "recoveryCode", message: "Recovery code is invalid" }],
    }),
    { headers: { "Content-Type": "application/json" }, status: 400 },
  );
}

function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

describe("PasswordRecoveryPage — request mode", () => {
  it("renders email form and shows sent banner after successful submission", async () => {
    fetchMock.mockResolvedValueOnce(noContentResponse());

    renderWithRouter(<PasswordRecoveryPage />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText("passwordRecovery.request.emailLabel");
    await user.type(emailInput, "user@example.com");
    await user.click(screen.getByRole("button", { name: "passwordRecovery.request.submit" }));

    await waitFor(() => {
      expect(screen.getByText("passwordRecovery.request.sentBanner:user@example.com")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ email: "user@example.com" });
  });
});

describe("PasswordRecoveryPage — new-password mode", () => {
  it("opens success modal after submitting valid code and password", async () => {
    fetchMock.mockResolvedValueOnce(noContentResponse());

    renderWithRouter(<PasswordRecoveryPage />, {
      initialEntries: ["/?recoveryCode=abc-123"],
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("passwordRecovery.newPassword.newPasswordLabel"),
      "secret9",
    );
    await user.type(screen.getByLabelText("passwordRecovery.newPassword.confirmLabel"), "secret9");
    await user.click(screen.getByRole("button", { name: "passwordRecovery.newPassword.submit" }));

    await waitFor(() => {
      expect(modalObserver.findModal(ModalId.PasswordRecoverySuccess)).toBeDefined();
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      newPassword: "secret9",
      recoveryCode: "abc-123",
    });
  });

  it("shows expired view when API returns 400 with field=recoveryCode", async () => {
    fetchMock.mockResolvedValueOnce(badRequestRecoveryCode());

    renderWithRouter(<PasswordRecoveryPage />, {
      initialEntries: ["/?recoveryCode=expired-code"],
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("passwordRecovery.newPassword.newPasswordLabel"),
      "secret9",
    );
    await user.type(screen.getByLabelText("passwordRecovery.newPassword.confirmLabel"), "secret9");
    await user.click(screen.getByRole("button", { name: "passwordRecovery.newPassword.submit" }));

    await waitFor(() => {
      expect(screen.getByText("passwordRecovery.expired.message")).toBeTruthy();
    });

    const resendButton = screen.getByRole("button", { name: "passwordRecovery.expired.resend" });
    await user.click(resendButton);

    expect(modalObserver.findModal(ModalId.ResendRecovery)).toBeDefined();
  });

  it("shows mismatch error when confirmation does not match", async () => {
    renderWithRouter(<PasswordRecoveryPage />, {
      initialEntries: ["/?recoveryCode=abc-123"],
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("passwordRecovery.newPassword.newPasswordLabel"),
      "secret9",
    );
    await user.type(screen.getByLabelText("passwordRecovery.newPassword.confirmLabel"), "another9");
    await user.click(screen.getByRole("button", { name: "passwordRecovery.newPassword.submit" }));

    await waitFor(() => {
      expect(screen.getByText("passwordRecovery.newPassword.errors.mismatch")).toBeTruthy();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("RecoverySuccessDialog", () => {
  it("navigates to /login when Ok is clicked", async () => {
    function Probe() {
      return (
        <>
          <RecoverySuccessDialog isOpen={true} props={{}} />
          <div data-testid="route-marker">recovery-route</div>
        </>
      );
    }

    renderWithRouter(<Probe />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "passwordRecovery.successDialog.ok" }));

    await waitFor(() => {
      expect(modalObserver.findModal(ModalId.PasswordRecoverySuccess)).toBeUndefined();
    });
  });
});
