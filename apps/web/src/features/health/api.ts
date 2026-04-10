import type { ApiHealth } from "@app/shared";

import { request } from "@/lib/http-client";

export const healthApi = {
  get: () => request<ApiHealth>("/api/health"),
};
