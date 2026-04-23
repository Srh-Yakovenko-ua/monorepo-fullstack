import { useInfiniteQuery } from "@tanstack/react-query";

import { commentsApi, commentsKeys } from "@/features/comments/api";

const PAGE_SIZE = 15;

export function usePostComments(postId: string) {
  return useInfiniteQuery({
    getNextPageParam: (
      lastPage: Awaited<ReturnType<typeof commentsApi.listByPost>>,
      _pages: unknown,
      _lastPageParam: number,
    ) => (lastPage.page < lastPage.pagesCount ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      commentsApi.listByPost({ pageNumber: pageParam, pageSize: PAGE_SIZE, postId }),
    queryKey: commentsKeys.postComments(postId),
  });
}
