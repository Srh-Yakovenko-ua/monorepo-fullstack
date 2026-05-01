import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_SORT,
  getNextSortForColumn,
  sortableColumnSchema,
  USER_SORT_OPTIONS,
  USER_SORT_VALUES,
} from "@/features/users/lib/sort";

const SEARCH_DEBOUNCE_MS = 300;

export function useUsersTableState() {
  const [filters, setFilters] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    searchEmail: parseAsString.withDefault(""),
    searchLogin: parseAsString.withDefault(""),
    sort: parseAsStringLiteral(USER_SORT_VALUES).withDefault(DEFAULT_SORT),
  });

  const { page, searchEmail, searchLogin, sort: sortValue } = filters;

  const [loginInput, setLoginInput] = useState(searchLogin);
  const [emailInput, setEmailInput] = useState(searchEmail);
  const loginDebounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const emailDebounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const selectedSort =
    USER_SORT_OPTIONS.find((option) => option.value === sortValue) ?? USER_SORT_OPTIONS[0];

  function handleLoginInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLoginInput(value);
    if (loginDebounceRef.current) clearTimeout(loginDebounceRef.current);
    loginDebounceRef.current = setTimeout(() => {
      void setFilters({ page: 1, searchLogin: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleEmailInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmailInput(value);
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    emailDebounceRef.current = setTimeout(() => {
      void setFilters({ page: 1, searchEmail: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSortChange(value: string) {
    const nextSort = USER_SORT_VALUES.find((availableSort) => availableSort === value);
    if (nextSort) void setFilters({ page: 1, sort: nextSort });
  }

  function handleSortClear() {
    void setFilters({ page: 1, sort: DEFAULT_SORT });
  }

  function handlePageChange(nextPage: number) {
    void setFilters({ page: nextPage });
  }

  function handleColumnSortClick(e: React.MouseEvent<HTMLButtonElement>) {
    const parsed = sortableColumnSchema.safeParse(e.currentTarget.dataset.sortColumn);
    if (!parsed.success) return;
    const nextSort = getNextSortForColumn(parsed.data, sortValue);
    void setFilters({ page: 1, sort: nextSort });
  }

  useEffect(() => {
    return () => {
      if (loginDebounceRef.current) clearTimeout(loginDebounceRef.current);
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, []);

  const hasSearchTerms = !!searchLogin || !!searchEmail;

  return {
    emailInput,
    handleColumnSortClick,
    handleEmailInputChange,
    handleLoginInputChange,
    handlePageChange,
    handleSortChange,
    handleSortClear,
    hasSearchTerms,
    loginInput,
    page,
    searchEmail,
    searchLogin,
    selectedSort,
    sortValue,
  };
}
