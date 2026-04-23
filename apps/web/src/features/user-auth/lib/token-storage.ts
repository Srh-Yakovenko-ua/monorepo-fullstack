import { z } from "zod";

const STORAGE_KEY = "user-auth-token";

const tokenSchema = z.string().min(1);

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Safari private mode
  }
}

export function getToken(): null | string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = tokenSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Safari private mode
  }
}
