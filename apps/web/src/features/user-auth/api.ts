import type { LoginInput, LoginSuccessViewModel, MeViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const userAuthApi = {
  login: (body: LoginInput) =>
    request<LoginSuccessViewModel>("/api/auth/login", {
      authMode: "none",
      body: JSON.stringify(body),
      method: "POST",
    }),

  me: () => request<MeViewModel>("/api/auth/me"),
};
