import type {
  BlogInput,
  BlogLookupItem,
  BlogSortField,
  BlogViewModel,
  Paginator,
} from "@app/shared";

import { request } from "@/lib/http-client";

export type BlogsListQuery = {
  pageNumber: number;
  pageSize: number;
  searchNameTerm?: string;
  sortBy: BlogSortField;
  sortDirection: "asc" | "desc";
};

export type BlogsLookupQuery = {
  pageNumber: number;
  pageSize: number;
  searchNameTerm?: string;
  sortBy?: BlogSortField;
  sortDirection?: "asc" | "desc";
};

export const blogsKeys = {
  all: ["blogs"] as const,
  list: (query: Omit<BlogsListQuery, "pageNumber">) => [...blogsKeys.lists(), query] as const,
  lists: () => [...blogsKeys.all, "list"] as const,
  lookup: (query: Omit<BlogsLookupQuery, "pageNumber">) =>
    [...blogsKeys.all, "lookup", query] as const,
};

export const blogsApi = {
  create: (input: BlogInput) =>
    request<BlogViewModel>("/api/blogs", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: (query: BlogsListQuery) => {
    const url = new URL("/api/blogs", window.location.origin);
    url.searchParams.set("pageNumber", String(query.pageNumber));
    url.searchParams.set("pageSize", String(query.pageSize));
    url.searchParams.set("sortBy", query.sortBy);
    url.searchParams.set("sortDirection", query.sortDirection);
    if (query.searchNameTerm) {
      url.searchParams.set("searchNameTerm", query.searchNameTerm);
    }
    return request<Paginator<BlogViewModel>>(url.pathname + url.search);
  },
  lookup: (query: BlogsLookupQuery) => {
    const url = new URL("/api/blogs/lookup", window.location.origin);
    url.searchParams.set("pageNumber", String(query.pageNumber));
    url.searchParams.set("pageSize", String(query.pageSize));
    if (query.sortBy) url.searchParams.set("sortBy", query.sortBy);
    if (query.sortDirection) url.searchParams.set("sortDirection", query.sortDirection);
    if (query.searchNameTerm) url.searchParams.set("searchNameTerm", query.searchNameTerm);
    return request<Paginator<BlogLookupItem>>(url.pathname + url.search);
  },
  remove: (id: string) => request<void>(`/api/blogs/${id}`, { method: "DELETE" }),
  update: (id: string, input: BlogInput) =>
    request<void>(`/api/blogs/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};
