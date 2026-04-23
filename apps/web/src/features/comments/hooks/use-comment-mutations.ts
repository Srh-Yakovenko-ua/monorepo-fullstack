import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commentsApi, commentsKeys } from "@/features/comments/api";

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
