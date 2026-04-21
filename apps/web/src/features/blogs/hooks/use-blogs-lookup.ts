import { useInfiniteQuery } from "@tanstack/react-query";

import { blogsApi, blogsKeys } from "@/features/blogs/api";

const PAGE_SIZE = 20;

type UseInfiniteBlogsLookupParams = {
  enabled: boolean;
  searchNameTerm?: string;
};

export function useInfiniteBlogsLookup({ enabled, searchNameTerm }: UseInfiniteBlogsLookupParams) {
  const queryParams = { pageSize: PAGE_SIZE, searchNameTerm };
  return useInfiniteQuery({
    enabled,
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof blogsApi.lookup>>) =>
      lastPage.page < lastPage.pagesCount ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      blogsApi.lookup({ pageNumber: pageParam, ...queryParams }),
    queryKey: blogsKeys.lookup(queryParams),
  });
}
