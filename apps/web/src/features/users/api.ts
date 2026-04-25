import type {
  CreateUserInput,
  Paginator,
  UpdateUserRoleInput,
  UsersQuery,
  UserViewModel,
} from "@app/shared";

import { request } from "@/lib/http-client";

export const usersKeys = {
  all: ["users"] as const,
  list: (query: Omit<UsersQuery, "pageNumber">) => [...usersKeys.lists(), query] as const,
  lists: () => [...usersKeys.all, "list"] as const,
};

export const usersApi = {
  create: (input: CreateUserInput) =>
    request<UserViewModel>("/api/users", {
      authMode: "bearer",
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: (query: UsersQuery) => {
    const url = new URL("/api/users", window.location.origin);
    url.searchParams.set("pageNumber", String(query.pageNumber));
    url.searchParams.set("pageSize", String(query.pageSize));
    url.searchParams.set("sortBy", query.sortBy);
    url.searchParams.set("sortDirection", query.sortDirection);
    if (query.searchLoginTerm) url.searchParams.set("searchLoginTerm", query.searchLoginTerm);
    if (query.searchEmailTerm) url.searchParams.set("searchEmailTerm", query.searchEmailTerm);
    return request<Paginator<UserViewModel>>(url.pathname + url.search, { authMode: "bearer" });
  },
  remove: (id: string) =>
    request<void>(`/api/users/${id}`, { authMode: "bearer", method: "DELETE" }),
  updateRole: ({ id, role }: { id: string; role: UpdateUserRoleInput["role"] }) =>
    request<void>(`/api/users/${id}/role`, {
      authMode: "bearer",
      body: JSON.stringify({ role }),
      method: "PUT",
    }),
};
