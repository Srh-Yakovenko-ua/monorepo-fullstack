const STORAGE_KEY = "admin-auth";

type AdminAuthPayload = {
  login: string;
  password: string;
};

export function clearAdminAuth(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Safari private mode
  }
}

export function getAdminAuthHeader(): null | string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return stored;
  } catch {
    return null;
  }
}

export function setAdminAuth({ login, password }: AdminAuthPayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, `Basic ${btoa(`${login}:${password}`)}`);
  } catch {
    // Safari private mode may block sessionStorage writes
  }
}
