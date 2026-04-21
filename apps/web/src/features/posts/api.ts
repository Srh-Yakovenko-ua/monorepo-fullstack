import type { PostInput, PostViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const postsKeys = {
  all: ["posts"] as const,
  detail: (id: string) => [...postsKeys.all, "detail", id] as const,
  lists: () => [...postsKeys.all, "list"] as const,
};

export const postsApi = {
  create: (input: PostInput) =>
    request<PostViewModel>("/api/posts", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getById: (id: string) => request<PostViewModel>(`/api/posts/${id}`),
  list: () => request<PostViewModel[]>("/api/posts"),
  remove: (id: string) => request<void>(`/api/posts/${id}`, { method: "DELETE" }),
  update: (id: string, input: PostInput) =>
    request<void>(`/api/posts/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};
