import { useQuery } from "@tanstack/react-query";

import { postsApi, postsKeys } from "@/features/posts/api";

export function usePosts() {
  return useQuery({
    queryFn: postsApi.list,
    queryKey: postsKeys.lists(),
  });
}
