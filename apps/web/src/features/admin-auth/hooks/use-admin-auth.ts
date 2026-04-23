import { clearAdminAuth, setAdminAuth } from "@/features/admin-auth/lib/admin-auth";
import { useAdminAuthStore } from "@/features/admin-auth/store/admin-auth-store";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http-client";

type SignInParams = {
  loginOrEmail: string;
  password: string;
};

export function useAdminAuth() {
  const isAuthed = useAdminAuthStore((state) => state.isAuthed);
  const setAuthed = useAdminAuthStore((state) => state.setAuthed);

  async function signIn({ loginOrEmail, password }: SignInParams) {
    const candidateHeader = `Basic ${btoa(`${loginOrEmail}:${password}`)}`;

    const res = await fetch(`${env.VITE_API_BASE_URL}/api/users?pageSize=1&pageNumber=1`, {
      headers: {
        Authorization: candidateHeader,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      throw new ApiError(401, "Invalid login or password");
    }

    if (!res.ok) {
      throw new ApiError(res.status, `HTTP ${res.status}`);
    }

    setAdminAuth({ login: loginOrEmail, password });
    setAuthed(true);
  }

  function signOut() {
    clearAdminAuth();
    setAuthed(false);
  }

  return { isAuthed, signIn, signOut };
}
