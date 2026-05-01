import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { userAuthApi } from "@/features/user-auth/api";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";

export const ME_QUERY_KEY = ["user-auth", "me"] as const;

export function useMe() {
  const token = useUserAuthStore((state) => state.token);
  const clearToken = useUserAuthStore((state) => state.clearToken);
  const queryClient = useQueryClient();

  const result = useQuery({
    enabled: !!token,
    queryFn: userAuthApi.me,
    queryKey: ME_QUERY_KEY,
    retry: false,
  });

  useEffect(() => {
    if (result.isError) {
      clearToken();
      queryClient.clear();
    }
  }, [result.isError, clearToken, queryClient]);

  return result;
}
