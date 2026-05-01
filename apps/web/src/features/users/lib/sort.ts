import type { UsersQuery } from "@app/shared";

import { z } from "zod";

export const SORT = {
  emailAToZ: "emailAToZ",
  emailZToA: "emailZToA",
  loginAToZ: "loginAToZ",
  loginZToA: "loginZToA",
  newest: "newest",
  oldest: "oldest",
} as const;

export const COLUMN = {
  createdAt: "createdAt",
  email: "email",
  login: "login",
} as const;

export const SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

export const USER_SORT_VALUES = [
  SORT.newest,
  SORT.oldest,
  SORT.loginAToZ,
  SORT.loginZToA,
  SORT.emailAToZ,
  SORT.emailZToA,
] as const;

export type UserSortValue = (typeof USER_SORT_VALUES)[number];

export const DEFAULT_SORT: UserSortValue = SORT.newest;

export type UserSortOption = {
  sortBy: UsersQuery["sortBy"];
  sortDirection: UsersQuery["sortDirection"];
  value: UserSortValue;
};

export const USER_SORT_OPTIONS = [
  { sortBy: COLUMN.createdAt, sortDirection: SORT_DIRECTION.desc, value: SORT.newest },
  { sortBy: COLUMN.createdAt, sortDirection: SORT_DIRECTION.asc, value: SORT.oldest },
  { sortBy: COLUMN.login, sortDirection: SORT_DIRECTION.asc, value: SORT.loginAToZ },
  { sortBy: COLUMN.login, sortDirection: SORT_DIRECTION.desc, value: SORT.loginZToA },
  { sortBy: COLUMN.email, sortDirection: SORT_DIRECTION.asc, value: SORT.emailAToZ },
  { sortBy: COLUMN.email, sortDirection: SORT_DIRECTION.desc, value: SORT.emailZToA },
] satisfies readonly [UserSortOption, ...UserSortOption[]];

export type SortableColumn = (typeof COLUMN)[keyof typeof COLUMN];

export const sortableColumnSchema = z.enum([COLUMN.createdAt, COLUMN.email, COLUMN.login]);

export const ARIA_SORT = {
  ascending: "ascending",
  descending: "descending",
  none: "none",
} as const;

export type AriaSort = (typeof ARIA_SORT)[keyof typeof ARIA_SORT];

export function getNextSortForColumn(
  column: SortableColumn,
  currentSort: UserSortValue,
): UserSortValue {
  if (column === COLUMN.login) {
    if (currentSort === SORT.loginAToZ) return SORT.loginZToA;
    if (currentSort === SORT.loginZToA) return DEFAULT_SORT;
    return SORT.loginAToZ;
  }
  if (column === COLUMN.email) {
    if (currentSort === SORT.emailAToZ) return SORT.emailZToA;
    if (currentSort === SORT.emailZToA) return DEFAULT_SORT;
    return SORT.emailAToZ;
  }
  return currentSort === SORT.oldest ? SORT.newest : SORT.oldest;
}

export function getSortDirectionForColumn(
  column: SortableColumn,
  currentSort: UserSortValue,
): AriaSort {
  if (column === COLUMN.login) {
    if (currentSort === SORT.loginAToZ) return ARIA_SORT.ascending;
    if (currentSort === SORT.loginZToA) return ARIA_SORT.descending;
  }
  if (column === COLUMN.email) {
    if (currentSort === SORT.emailAToZ) return ARIA_SORT.ascending;
    if (currentSort === SORT.emailZToA) return ARIA_SORT.descending;
  }
  if (column === COLUMN.createdAt) {
    if (currentSort === SORT.oldest) return ARIA_SORT.ascending;
    if (currentSort === SORT.newest) return ARIA_SORT.descending;
  }
  return ARIA_SORT.none;
}
