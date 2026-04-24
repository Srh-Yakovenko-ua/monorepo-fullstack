import { useQueryClient } from "@tanstack/react-query";

import { ME_QUERY_KEY, useMe } from "@/features/user-auth/hooks/use-me";
import { useSignIn } from "@/features/user-auth/hooks/use-sign-in";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";

export function useUserAuth() {
  const queryClient = useQueryClient();
  const storeClearToken = useUserAuthStore((state) => state.clearToken);
  const { data: user, isLoading } = useMe();
  const { mutateAsync: signIn } = useSignIn();

  function signOut() {
    storeClearToken();
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
  }

  return {
    isAuthed: !!user,
    isLoading,
    signIn,
    signOut,
    user: user ?? null,
  };
}
