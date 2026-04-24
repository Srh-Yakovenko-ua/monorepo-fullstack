import { z } from "zod";

import { clearAdminAuth, getAdminAuthHeader } from "@/features/admin-auth/lib/admin-auth";
import { useAdminAuthStore } from "@/features/admin-auth/store/admin-auth-store";
import { getToken } from "@/features/user-auth/lib/token-storage";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";
import { env } from "@/lib/env";

const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const apiErrorBodySchema = z.object({
  errorsMessages: z.array(fieldErrorSchema),
});

export type AuthMode = "basic" | "jwt" | "none";

export type FieldError = z.infer<typeof fieldErrorSchema>;

export type RequestOptions = RequestInit & { authMode?: AuthMode };

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

export async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { authMode = "jwt", ...fetchInit } = init ?? {};
  const { header, mode } = resolveAuthHeader(authMode);

  const authHeaders: Record<string, string> = header ? { Authorization: header } : {};

  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...fetchInit.headers,
    },
  });

  if (res.status === 401 && header) {
    clearAuthFor(mode);
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

function clearAuthFor(mode: AuthMode): void {
  if (mode === "jwt") {
    useUserAuthStore.getState().clearToken();
    return;
  }
  if (mode === "basic") {
    clearAdminAuth();
    useAdminAuthStore.getState().setAuthed(false);
  }
}

function resolveAuthHeader(authMode: AuthMode): { header: null | string; mode: AuthMode } {
  if (authMode === "none") return { header: null, mode: "none" };
  if (authMode === "basic") {
    return { header: getAdminAuthHeader(), mode: "basic" };
  }
  const token = getToken();
  return { header: token ? `Bearer ${token}` : null, mode: "jwt" };
}
