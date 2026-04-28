import type { LikeStatus, Paginator, PostViewModel } from "@app/shared";
import type { InfiniteData } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postsApi, postsKeys } from "@/features/posts/api";
import { applyExtendedLikeStatus } from "@/features/posts/lib/apply-extended-like-status";

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
  });
}

export function useSetPostLikeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ likeStatus, postId }: { likeStatus: LikeStatus; postId: string }) =>
      postsApi.setLikeStatus({ likeStatus, postId }),
    onError: (_error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.detail(postId) });
      void queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
    },
    onMutate: async ({ likeStatus, postId }) => {
      const detailKey = postsKeys.detail(postId);
      const listsKey = postsKeys.lists();

      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listsKey }),
      ]);

      const previousDetail = queryClient.getQueryData<PostViewModel>(detailKey);
      const previousLists = queryClient.getQueriesData<
        InfiniteData<Paginator<PostViewModel>, number>
      >({
        queryKey: listsKey,
      });

      queryClient.setQueryData<PostViewModel>(detailKey, (oldPost) =>
        oldPost
          ? {
              ...oldPost,
              extendedLikesInfo: applyExtendedLikeStatus({
                extendedLikesInfo: oldPost.extendedLikesInfo,
                nextStatus: likeStatus,
              }),
            }
          : oldPost,
      );

      previousLists.forEach(([key]) => {
        queryClient.setQueryData<InfiniteData<Paginator<PostViewModel>, number>>(key, (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((eachPage) => ({
              ...eachPage,
              items: eachPage.items.map((eachPost) =>
                eachPost.id === postId
                  ? {
                      ...eachPost,
                      extendedLikesInfo: applyExtendedLikeStatus({
                        extendedLikesInfo: eachPost.extendedLikesInfo,
                        nextStatus: likeStatus,
                      }),
                    }
                  : eachPost,
              ),
            })),
          };
        });
      });

      return { previousDetail, previousLists };
    },
    onSettled: (_data, _error, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.detail(postId) });
      void queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
    },
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof postsApi.update>[1]) => postsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
  });
}
