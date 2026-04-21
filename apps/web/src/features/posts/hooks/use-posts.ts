import type { PostSortField } from "@app/shared";

import { useInfiniteQuery } from "@tanstack/react-query";

import { postsApi, postsKeys } from "@/features/posts/api";

const PAGE_SIZE = 15;

type UseInfinitePostsParams = {
  sortBy: PostSortField;
  sortDirection: "asc" | "desc";
};

export function useInfinitePosts({ sortBy, sortDirection }: UseInfinitePostsParams) {
  const queryParams = { pageSize: PAGE_SIZE, sortBy, sortDirection };
  return useInfiniteQuery({
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof postsApi.list>>) =>
      lastPage.page < lastPage.pagesCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      postsApi.list({ pageNumber: pageParam, ...queryParams }),
    queryKey: postsKeys.list(queryParams),
  });
}
