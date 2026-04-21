import { useMutation, useQueryClient } from "@tanstack/react-query";

import { blogsApi, blogsKeys } from "@/features/blogs/api";

export function useCreateBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogsKeys.all });
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogsKeys.all });
    },
  });
}

export function useUpdateBlog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof blogsApi.update>[1]) => blogsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogsKeys.all });
    },
  });
}
