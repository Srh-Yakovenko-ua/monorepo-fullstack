import type { PostInput, PostViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const postsKeys = {
  all: ["posts"] as const,
  lists: () => [...postsKeys.all, "list"] as const,
};

export const postsApi = {
  create: (input: PostInput) =>
    request<PostViewModel>("/api/posts", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: () => request<PostViewModel[]>("/api/posts"),
  remove: (id: string) => request<void>(`/api/posts/${id}`, { method: "DELETE" }),
  update: (id: string, input: PostInput) =>
    request<void>(`/api/posts/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};
