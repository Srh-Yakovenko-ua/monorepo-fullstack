import type { BlogInput, BlogViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const blogsKeys = {
  all: ["blogs"] as const,
  detail: (id: string) => [...blogsKeys.all, "detail", id] as const,
  lists: () => [...blogsKeys.all, "list"] as const,
};

export const blogsApi = {
  create: (input: BlogInput) =>
    request<BlogViewModel>("/api/blogs", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getById: (id: string) => request<BlogViewModel>(`/api/blogs/${id}`),
  list: () => request<BlogViewModel[]>("/api/blogs"),
  remove: (id: string) => request<void>(`/api/blogs/${id}`, { method: "DELETE" }),
  update: (id: string, input: BlogInput) =>
    request<void>(`/api/blogs/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};
