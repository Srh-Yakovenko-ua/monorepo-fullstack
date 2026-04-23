import type { UsersQuery } from "@app/shared";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { usersApi, usersKeys } from "@/features/users/api";

const PAGE_SIZE = 10;

type UseUsersParams = {
  pageNumber: number;
  searchEmailTerm?: string;
  searchLoginTerm?: string;
  sortBy: UsersQuery["sortBy"];
  sortDirection: UsersQuery["sortDirection"];
};

export function useUsers({
  pageNumber,
  searchEmailTerm,
  searchLoginTerm,
  sortBy,
  sortDirection,
}: UseUsersParams) {
  const queryParams = {
    pageSize: PAGE_SIZE,
    searchEmailTerm,
    searchLoginTerm,
    sortBy,
    sortDirection,
  };

  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => usersApi.list({ pageNumber, ...queryParams }),
    queryKey: [...usersKeys.list(queryParams), pageNumber],
  });
}
