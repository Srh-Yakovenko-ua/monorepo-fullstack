import type { Paginator, PostInput, PostSortField, PostViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export type PostsListQuery = {
  pageNumber: number;
  pageSize: number;
  sortBy: PostSortField;
  sortDirection: "asc" | "desc";
};

export const postsKeys = {
  all: ["posts"] as const,
  detail: (id: string) => [...postsKeys.all, "detail", id] as const,
  list: (query: Omit<PostsListQuery, "pageNumber">) => [...postsKeys.lists(), query] as const,
  lists: () => [...postsKeys.all, "list"] as const,
};

export const postsApi = {
  create: (input: PostInput) =>
    request<PostViewModel>("/api/posts", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  getById: (id: string) => request<PostViewModel>(`/api/posts/${id}`),
  list: (query: PostsListQuery) => {
    const url = new URL("/api/posts", window.location.origin);
    url.searchParams.set("pageNumber", String(query.pageNumber));
    url.searchParams.set("pageSize", String(query.pageSize));
    url.searchParams.set("sortBy", query.sortBy);
    url.searchParams.set("sortDirection", query.sortDirection);
    return request<Paginator<PostViewModel>>(url.pathname + url.search);
  },
  remove: (id: string) => request<void>(`/api/posts/${id}`, { method: "DELETE" }),
  update: (id: string, input: PostInput) =>
    request<void>(`/api/posts/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};
