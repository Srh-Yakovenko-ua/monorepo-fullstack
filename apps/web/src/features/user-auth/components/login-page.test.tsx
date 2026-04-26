import { describe, expect, it, vi } from "vitest";

import { UserLoginPage } from "@/features/user-auth/components/login-page";
import { renderWithRouter, screen } from "@/test-utils";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/user-auth/hooks/use-user-auth", () => ({
  useUserAuth: () => ({ isAuthed: false, isLoading: false, signIn: vi.fn(), user: null }),
}));

describe("UserLoginPage", () => {
  it("renders Forgot password link pointing to /password-recovery", () => {
    renderWithRouter(<UserLoginPage />);

    const link = screen.getByRole("link", { name: "userAuth.login.forgotPassword" });
    expect(link.getAttribute("href")).toBe("/password-recovery");
  });
});
