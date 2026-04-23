import { z } from "zod";

import { clearAdminAuth, getAdminAuthHeader } from "@/features/admin-auth/lib/admin-auth";
import { useAdminAuthStore } from "@/features/admin-auth/store/admin-auth-store";
import { env } from "@/lib/env";

const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

const apiErrorBodySchema = z.object({
  errorsMessages: z.array(fieldErrorSchema),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;

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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const adminHeader = getAdminAuthHeader();
  const isLoginEndpoint = path === "/api/auth/login";

  const authHeaders: Record<string, string> =
    adminHeader && !isLoginEndpoint ? { Authorization: adminHeader } : {};

  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
  });

  if (res.status === 401 && adminHeader && !isLoginEndpoint) {
    clearAdminAuth();
    useAdminAuthStore.getState().setAuthed(false);
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
