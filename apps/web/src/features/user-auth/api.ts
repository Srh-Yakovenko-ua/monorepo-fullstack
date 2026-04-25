import type { LoginInput, LoginSuccessViewModel, MeViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const userAuthApi = {
  login: (body: LoginInput) =>
    request<LoginSuccessViewModel>("/api/auth/login", {
      authMode: "none",
      body: JSON.stringify(body),
      method: "POST",
    }),

  logout: () =>
    request<void>("/api/auth/logout", {
      authMode: "none",
      method: "POST",
    }),

  me: () => request<MeViewModel>("/api/auth/me", { authMode: "bearer" }),

  refresh: () =>
    request<LoginSuccessViewModel>("/api/auth/refresh-token", {
      authMode: "none",
      method: "POST",
    }),
};
