import type { NewPasswordInput, PasswordRecoveryInput } from "@app/shared";

import { request } from "@/lib/http-client";

export const passwordRecoveryApi = {
  recover: (input: PasswordRecoveryInput) =>
    request<void>("/api/auth/password-recovery", {
      authMode: "none",
      body: JSON.stringify(input),
      method: "POST",
    }),

  setNewPassword: (input: NewPasswordInput) =>
    request<void>("/api/auth/new-password", {
      authMode: "none",
      body: JSON.stringify(input),
      method: "POST",
    }),
};
