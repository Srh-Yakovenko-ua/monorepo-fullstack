import { useQuery } from "@tanstack/react-query";

import { postsApi, postsKeys } from "@/features/posts/api";

export function usePost(id: string) {
  return useQuery({
    queryFn: () => postsApi.getById(id),
    queryKey: postsKeys.detail(id),
  });
}
