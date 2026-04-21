import { useQuery } from "@tanstack/react-query";

import { blogsApi, blogsKeys } from "@/features/blogs/api";

export function useBlogs() {
  return useQuery({
    queryFn: blogsApi.list,
    queryKey: blogsKeys.lists(),
  });
}
