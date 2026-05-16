import { useQuery } from "@tanstack/react-query";

import { postsApi, postsKeys } from "@/features/posts/api";

export function usePost(id: number) {
  return useQuery({
    queryFn: () => postsApi.getById(id),
    queryKey: postsKeys.detail(id),
  });
}
