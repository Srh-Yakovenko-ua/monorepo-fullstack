import type { CommentViewModel, LikeStatus, Paginator } from "@app/shared";
import type { InfiniteData } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commentsApi, commentsKeys } from "@/features/comments/api";
import { applyLikeStatus } from "@/features/comments/lib/apply-like-status";

type CommentsInfiniteData = InfiniteData<Paginator<CommentViewModel>, number>;

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content }: { content: string }) => commentsApi.create({ content, postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.postComments(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.remove(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.postComments(postId) });
    },
  });
}

export function useSetCommentLikeStatus({ postId }: { postId: string }) {
  const queryClient = useQueryClient();
  const queryKey = commentsKeys.postComments(postId);

  return useMutation({
    mutationFn: ({ commentId, likeStatus }: { commentId: string; likeStatus: LikeStatus }) =>
      commentsApi.setLikeStatus({ commentId, likeStatus }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onMutate: async ({ commentId, likeStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<CommentsInfiniteData>(queryKey);

      queryClient.setQueryData<CommentsInfiniteData>(queryKey, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((eachPage) => ({
            ...eachPage,
            items: eachPage.items.map((eachComment) =>
              eachComment.id === commentId
                ? {
                    ...eachComment,
                    likesInfo: applyLikeStatus({
                      likesInfo: eachComment.likesInfo,
                      nextStatus: likeStatus,
                    }),
                  }
                : eachComment,
            ),
          })),
        };
      });

      return { previousData };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentsApi.update({ commentId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.postComments(postId) });
    },
  });
}
