import { useQuery } from "@tanstack/react-query";

import { userAuthApi } from "@/features/user-auth/api";
import { useUserAuthStore } from "@/features/user-auth/store/user-auth-store";

export const ME_QUERY_KEY = ["user-auth", "me"] as const;

export function useMe() {
  const token = useUserAuthStore((state) => state.token);

  return useQuery({
    enabled: !!token,
    queryFn: userAuthApi.me,
    queryKey: ME_QUERY_KEY,
    retry: false,
  });
}
