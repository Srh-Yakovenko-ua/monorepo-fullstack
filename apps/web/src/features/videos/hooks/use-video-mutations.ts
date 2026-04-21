import type { UpdateVideoInput } from "@app/shared";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { videosApi, videosKeys } from "@/features/videos/api";

export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: videosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videosKeys.all });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: videosApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videosKeys.all });
    },
  });
}

export function useUpdateVideo(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVideoInput) => videosApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videosKeys.all });
    },
  });
}
