import type { BlogSortField } from "@app/shared";

import { useInfiniteQuery } from "@tanstack/react-query";

import { blogsApi, blogsKeys } from "@/features/blogs/api";

const PAGE_SIZE = 15;

type UseInfiniteBlogsParams = {
  searchNameTerm?: string;
  sortBy: BlogSortField;
  sortDirection: "asc" | "desc";
};

export function useInfiniteBlogs({
  searchNameTerm,
  sortBy,
  sortDirection,
}: UseInfiniteBlogsParams) {
  const queryParams = { pageSize: PAGE_SIZE, searchNameTerm, sortBy, sortDirection };
  return useInfiniteQuery({
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof blogsApi.list>>) =>
      lastPage.page < lastPage.pagesCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      blogsApi.list({ pageNumber: pageParam, ...queryParams }),
    queryKey: blogsKeys.list(queryParams),
  });
}
