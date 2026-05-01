import type { LoginSuccessViewModel } from "@app/shared";

import { z } from "zod";

import { getToken } from "@/features/user-auth/lib/token-storage";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";
import { env } from "@/lib/env";
import { queryClient } from "@/lib/query-client";

const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const apiErrorBodySchema = z.object({
  errorsMessages: z.array(fieldErrorSchema),
});

export type AuthMode = "bearer" | "none";

export type FieldError = z.infer<typeof fieldErrorSchema>;

export type RequestOptions = RequestInit & { authMode?: AuthMode };

type InternalRequestOptions = RequestOptions & { _skipRefresh?: boolean };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: null | Promise<string> = null;

export async function request<T>(path: string, init?: InternalRequestOptions): Promise<T> {
  const { _skipRefresh = false, authMode = "bearer", ...fetchInit } = init ?? {};

  const token = authMode === "bearer" ? getToken() : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...fetchInit,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...fetchInit.headers,
    },
  });

  if (
    (res.status === 401 || res.status === 403) &&
    authMode === "bearer" &&
    !_skipRefresh &&
    path !== "/api/auth/refresh-token" &&
    path !== "/api/auth/login"
  ) {
    try {
      if (refreshPromise === null) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return request<T>(path, { ...init, _skipRefresh: true });
    } catch {
      useUserAuthStore.getState().clearToken();
      queryClient.clear();
      throw new ApiError(401, "Unauthorized");
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    try {
      const body = JSON.parse(text);
      const parsed = apiErrorBodySchema.safeParse(body);
      if (parsed.success) {
        throw new ApiError(res.status, `HTTP ${res.status}`, parsed.data.errorsMessages);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
    throw new ApiError(res.status, text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<string> {
  const data = await request<LoginSuccessViewModel>("/api/auth/refresh-token", {
    _skipRefresh: true,
    authMode: "none",
    method: "POST",
  });
  useUserAuthStore.getState().setToken(data.accessToken);
  return data.accessToken;
}
