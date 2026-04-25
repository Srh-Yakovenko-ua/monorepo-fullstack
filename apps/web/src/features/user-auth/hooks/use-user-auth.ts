import { useQueryClient } from "@tanstack/react-query";

import { userAuthApi } from "@/features/user-auth/api";
import { useMe } from "@/features/user-auth/hooks/use-me";
import { useSignIn } from "@/features/user-auth/hooks/use-sign-in";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";

export function useUserAuth() {
  const queryClient = useQueryClient();
  const storeClearToken = useUserAuthStore((state) => state.clearToken);
  const { data: user, isLoading } = useMe();
  const { mutateAsync: signIn } = useSignIn();

  async function signOut() {
    try {
      await userAuthApi.logout();
    } catch {
      void 0;
    }
    storeClearToken();
    queryClient.clear();
  }

  return {
    isAuthed: !!user,
    isLoading,
    signIn,
    signOut,
    user: user ?? null,
  };
}
