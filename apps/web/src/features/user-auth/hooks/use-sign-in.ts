import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userAuthApi } from "@/features/user-auth/api";
import { ME_QUERY_KEY } from "@/features/user-auth/hooks/use-me";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";

export function useSignIn() {
  const queryClient = useQueryClient();
  const storeSetToken = useUserAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: userAuthApi.login,
    onSuccess: ({ accessToken }) => {
      storeSetToken(accessToken);
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
