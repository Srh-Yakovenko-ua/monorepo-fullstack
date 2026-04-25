import type { UpdateUserRoleInput, UsersQuery, UserViewModel } from "@app/shared";

import { ROLE } from "@app/shared";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Plus, Search, Trash2, Users } from "lucide-react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ModalId, modalObserver } from "@/features/modals";
import { RoleBadge } from "@/features/user-auth/components/role-badge";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { useDeleteUser, useUpdateUserRole } from "@/features/users/hooks/use-user-mutations";
import { useUsers } from "@/features/users/hooks/use-users";
import { usePageTitle } from "@/hooks/use-page-title";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORT = {
  emailAToZ: "emailAToZ",
  emailZToA: "emailZToA",
  loginAToZ: "loginAToZ",
  loginZToA: "loginZToA",
  newest: "newest",
  oldest: "oldest",
} as const;

const COLUMN = {
  createdAt: "createdAt",
  email: "email",
  login: "login",
} as const;

const SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

const USER_SORT_VALUES = [
  SORT.newest,
  SORT.oldest,
  SORT.loginAToZ,
  SORT.loginZToA,
  SORT.emailAToZ,
  SORT.emailZToA,
] as const;
type UserSortValue = (typeof USER_SORT_VALUES)[number];

const DEFAULT_SORT: UserSortValue = SORT.newest;

type UserSortOption = {
  sortBy: UsersQuery["sortBy"];
  sortDirection: UsersQuery["sortDirection"];
  value: UserSortValue;
};

const USER_SORT_OPTIONS = [
  { sortBy: COLUMN.createdAt, sortDirection: SORT_DIRECTION.desc, value: SORT.newest },
  { sortBy: COLUMN.createdAt, sortDirection: SORT_DIRECTION.asc, value: SORT.oldest },
  { sortBy: COLUMN.login, sortDirection: SORT_DIRECTION.asc, value: SORT.loginAToZ },
  { sortBy: COLUMN.login, sortDirection: SORT_DIRECTION.desc, value: SORT.loginZToA },
  { sortBy: COLUMN.email, sortDirection: SORT_DIRECTION.asc, value: SORT.emailAToZ },
  { sortBy: COLUMN.email, sortDirection: SORT_DIRECTION.desc, value: SORT.emailZToA },
] satisfies readonly [UserSortOption, ...UserSortOption[]];

const SKELETON_ROW_COUNT = 5;
const SEARCH_DEBOUNCE_MS = 300;
const USER_ID_PREFIX_CHARS = 6;
const USER_ID_SUFFIX_CHARS = 4;
const USER_ID_TRUNCATE_THRESHOLD = USER_ID_PREFIX_CHARS + USER_ID_SUFFIX_CHARS + 2;

type BuildPageNumbersParams = {
  currentPage: number;
  pagesCount: number;
};

type SortableColumn = (typeof COLUMN)[keyof typeof COLUMN];

type SortableHeaderProps = {
  className?: string;
  column: SortableColumn;
  currentSort: UserSortValue;
  label: string;
  onSortClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

type UsersPaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  pagesCount: number;
  totalCount: number;
};

type UserTableRowProps = {
  currentUserId: null | string;
  isSuperAdmin: boolean;
  onCopyEmail: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCopyId: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRoleChange: (params: { role: UpdateUserRoleInput["role"]; userId: string }) => void;
  roleChangePending: boolean;
  user: UserViewModel;
};

export function UsersPage() {
  const { t } = useTranslation();
  usePageTitle(t("users.list.title"));

  const { user: currentUser } = useUserAuth();
  const isSuperAdmin = currentUser?.role === ROLE.superAdmin;

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

  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();

  const selectedSort =
    USER_SORT_OPTIONS.find((option) => option.value === sortValue) ?? USER_SORT_OPTIONS[0];

  const { data, error, isError, isFetching, isLoading } = useUsers({
    pageNumber: page,
    searchEmailTerm: searchEmail || undefined,
    searchLoginTerm: searchLogin || undefined,
    sortBy: selectedSort.sortBy,
    sortDirection: selectedSort.sortDirection,
  });

  const users = data?.items ?? [];
  const pagesCount = data?.pagesCount ?? 1;
  const totalCount = data?.totalCount ?? 0;

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

  function handleOpenCreate() {
    modalObserver.addModal(ModalId.UserForm, {});
  }

  function handlePageChange(nextPage: number) {
    void setFilters({ page: nextPage });
  }

  function handleColumnSortClick(e: React.MouseEvent<HTMLButtonElement>) {
    const column = e.currentTarget.dataset.sortColumn as SortableColumn | undefined;
    if (!column) return;
    const nextSort = getNextSortForColumn(column, sortValue);
    void setFilters({ page: 1, sort: nextSort });
  }

  function handleDeleteClick(e: React.MouseEvent<HTMLButtonElement>) {
    const userId = e.currentTarget.dataset.userId;
    const userLogin = e.currentTarget.dataset.userLogin;
    if (!userId) return;

    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("users.delete.confirmLabel"),
      description: t("users.delete.description"),
      onConfirm: async () => {
        try {
          await deleteUser.mutateAsync(userId);
          toast.success(t("users.toasts.deleted"));
        } catch {
          toast.error(t("users.toasts.deleteFailed"));
        }
      },
      title: t("users.delete.title", { login: userLogin }),
      tone: "destructive",
    });
  }

  function handleCopyId(e: React.MouseEvent<HTMLButtonElement>) {
    const userId = e.currentTarget.dataset.userId;
    if (!userId) return;
    void navigator.clipboard.writeText(userId).then(() => {
      toast.success(t("users.list.idCopied"));
    });
  }

  function handleCopyEmail(e: React.MouseEvent<HTMLButtonElement>) {
    const email = e.currentTarget.dataset.userEmail;
    if (!email) return;
    void navigator.clipboard.writeText(email).then(() => {
      toast.success(t("users.list.emailCopied"));
    });
  }

  async function handleRoleChange({
    role,
    userId,
  }: {
    role: UpdateUserRoleInput["role"];
    userId: string;
  }) {
    try {
      await updateUserRole.mutateAsync({ id: userId, role });
      toast.success(t("users.toasts.roleUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("users.toasts.roleUpdateFailed"));
    }
  }

  useEffect(() => {
    return () => {
      if (loginDebounceRef.current) clearTimeout(loginDebounceRef.current);
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, []);

  const hasSearchTerms = !!searchLogin || !!searchEmail;

  const tableHeader = (
    <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm [&_tr]:border-b">
      <TableRow>
        <SortableHeader
          column={COLUMN.login}
          currentSort={sortValue}
          label={t("users.list.columns.username")}
          onSortClick={handleColumnSortClick}
        />
        <SortableHeader
          column={COLUMN.email}
          currentSort={sortValue}
          label={t("users.list.columns.email")}
          onSortClick={handleColumnSortClick}
        />
        <TableHead className="h-12 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase first:pl-6 last:pr-6">
          {t("users.list.columns.role")}
        </TableHead>
        <TableHead className="hidden h-12 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase first:pl-6 last:pr-6 md:table-cell">
          {t("users.list.columns.id")}
        </TableHead>
        <SortableHeader
          className="hidden lg:table-cell"
          column={COLUMN.createdAt}
          currentSort={sortValue}
          label={t("users.list.columns.createdAt")}
          onSortClick={handleColumnSortClick}
        />
        <TableHead className="h-12 w-16 px-4 text-right font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase first:pl-6 last:pr-6">
          <span className="sr-only">{t("users.list.columns.actions")}</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <main className="relative flex h-[calc(100dvh-var(--shell-header-height))] flex-col overflow-hidden px-5 pb-6 md:px-8 md:pb-8 lg:px-12">
      <div className="flex flex-wrap items-center gap-2 pt-5">
        <div className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            onChange={handleLoginInputChange}
            placeholder={t("users.list.searchLoginPlaceholder")}
            value={loginInput}
          />
        </div>

        <div className="relative min-w-[140px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            onChange={handleEmailInputChange}
            placeholder={t("users.list.searchEmailPlaceholder")}
            value={emailInput}
          />
        </div>

        <div className="md:hidden">
          <Select onValueChange={handleSortChange} value={sortValue}>
            <SelectTrigger
              className="h-8 w-[150px] text-sm"
              isClearable={sortValue !== DEFAULT_SORT}
              onClear={handleSortClear}
            >
              <SelectValue placeholder={t("users.list.sort.label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SORT.newest}>{t("users.list.sort.newest")}</SelectItem>
              <SelectItem value={SORT.oldest}>{t("users.list.sort.oldest")}</SelectItem>
              <SelectItem value={SORT.loginAToZ}>{t("users.list.sort.loginAToZ")}</SelectItem>
              <SelectItem value={SORT.loginZToA}>{t("users.list.sort.loginZToA")}</SelectItem>
              <SelectItem value={SORT.emailAToZ}>{t("users.list.sort.emailAToZ")}</SelectItem>
              <SelectItem value={SORT.emailZToA}>{t("users.list.sort.emailZToA")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button className="shrink-0 gap-1.5" onClick={handleOpenCreate} size="sm">
          <Plus className="size-3.5" />
          {t("users.list.addButton")}
        </Button>
      </div>

      <section className="mt-5 flex min-h-0 flex-1 flex-col">
        {isLoading && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
            <Table containerClassName="min-h-0 flex-1 overflow-auto">
              {tableHeader}
              <TableBody>
                {Array.from({ length: SKELETON_ROW_COUNT }).map((_, skeletonIndex) => (
                  <TableRow className="h-14" key={`skeleton-row-${skeletonIndex}`}>
                    <TableCell className="px-4 py-3 first:pl-6">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="hidden px-4 py-3 lg:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4 py-3 last:pr-6">
                      <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {isError && (
          <div className="animate-in rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md duration-500 fill-mode-both fade-in">
            <p
              className="font-display text-base font-normal text-destructive"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("users.list.error")}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {error.message}
            </p>
          </div>
        )}

        {!isLoading && !isError && users.length === 0 && (
          <div className="animate-in rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-700 fill-mode-both fade-in">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
              <Users className="size-6 text-primary/70" />
            </div>
            <p
              className="font-display text-lg font-normal text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              {hasSearchTerms ? t("users.list.noResults") : t("users.list.empty")}
            </p>
            {!hasSearchTerms && (
              <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                {t("users.list.emptyDescription")}
              </p>
            )}
          </div>
        )}

        {!isLoading && !isError && users.length > 0 && (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md transition-opacity duration-150",
              isFetching && "opacity-70",
            )}
          >
            <Table containerClassName="min-h-0 flex-1 overflow-auto">
              {tableHeader}
              <TableBody>
                {users.map((user) => (
                  <UserTableRow
                    currentUserId={currentUser?.userId ?? null}
                    isSuperAdmin={isSuperAdmin}
                    key={user.id}
                    onCopyEmail={handleCopyEmail}
                    onCopyId={handleCopyId}
                    onDeleteClick={handleDeleteClick}
                    onRoleChange={handleRoleChange}
                    roleChangePending={updateUserRole.isPending}
                    user={user}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && !isError && pagesCount > 1 && (
          <div className="shrink-0 pt-4">
            <UsersPagination
              currentPage={page}
              onPageChange={handlePageChange}
              pagesCount={pagesCount}
              totalCount={totalCount}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function buildPageNumbers({
  currentPage,
  pagesCount,
}: BuildPageNumbersParams): ("ellipsis" | number)[] {
  if (pagesCount <= 7) {
    return Array.from({ length: pagesCount }, (_, index) => index + 1);
  }

  const pages: ("ellipsis" | number)[] = [1];

  if (currentPage > 3) pages.push("ellipsis");

  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(pagesCount - 1, currentPage + 1);

  for (let pageIndex = rangeStart; pageIndex <= rangeEnd; pageIndex++) {
    pages.push(pageIndex);
  }

  if (currentPage < pagesCount - 2) pages.push("ellipsis");

  pages.push(pagesCount);

  return pages;
}

const ARIA_SORT = {
  ascending: "ascending",
  descending: "descending",
  none: "none",
} as const;

type AriaSort = (typeof ARIA_SORT)[keyof typeof ARIA_SORT];

function getNextSortForColumn(column: SortableColumn, currentSort: UserSortValue): UserSortValue {
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

function getSortDirectionForColumn(column: SortableColumn, currentSort: UserSortValue): AriaSort {
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

function SortableHeader({
  className,
  column,
  currentSort,
  label,
  onSortClick,
}: SortableHeaderProps) {
  const { t } = useTranslation();
  const direction = getSortDirectionForColumn(column, currentSort);
  const isActive = direction !== ARIA_SORT.none;

  return (
    <TableHead aria-sort={direction} className={cn("h-12 px-4 first:pl-6 last:pr-6", className)}>
      <button
        aria-label={t("users.list.sortAriaLabel", { column: label })}
        className={cn(
          "group/sort-btn -mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
          isActive
            ? "text-foreground hover:bg-muted/60"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
        data-sort-column={column}
        onClick={onSortClick}
        type="button"
      >
        <span>{label}</span>
        {direction === ARIA_SORT.ascending && (
          <ArrowUp className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
        )}
        {direction === ARIA_SORT.descending && (
          <ArrowDown className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
        )}
        {direction === ARIA_SORT.none && (
          <ArrowUpDown
            className="size-4 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity duration-150 group-hover/sort-btn:opacity-100"
            strokeWidth={2}
          />
        )}
      </button>
    </TableHead>
  );
}

function truncateUserId(id: string): string {
  if (id.length <= USER_ID_TRUNCATE_THRESHOLD) return id;
  return `${id.slice(0, USER_ID_PREFIX_CHARS)}…${id.slice(-USER_ID_SUFFIX_CHARS)}`;
}

function UsersPagination({ currentPage, onPageChange, pagesCount }: UsersPaginationProps) {
  const pageNumbers = buildPageNumbers({ currentPage, pagesCount });

  function handlePreviousClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (currentPage > 1) onPageChange(currentPage - 1);
  }

  function handleNextClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (currentPage < pagesCount) onPageChange(currentPage + 1);
  }

  function handlePageLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const targetPage = Number(e.currentTarget.dataset.page);
    if (targetPage && targetPage !== currentPage) onPageChange(targetPage);
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={currentPage === 1}
            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            href="#"
            onClick={handlePreviousClick}
          />
        </PaginationItem>

        {pageNumbers.map((pageEntry, pageEntryIndex) => (
          <PaginationItem key={`page-entry-${pageEntryIndex}`}>
            {pageEntry === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                data-page={pageEntry}
                href="#"
                isActive={pageEntry === currentPage}
                onClick={handlePageLinkClick}
              >
                {pageEntry}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            aria-disabled={currentPage === pagesCount}
            className={cn(currentPage === pagesCount && "pointer-events-none opacity-50")}
            href="#"
            onClick={handleNextClick}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function UserTableRow({
  currentUserId,
  isSuperAdmin,
  onCopyEmail,
  onCopyId,
  onDeleteClick,
  onRoleChange,
  roleChangePending,
  user,
}: UserTableRowProps) {
  const { t } = useTranslation();

  const isOwnRow = user.id === currentUserId;
  const isTargetSuperAdmin = user.role === ROLE.superAdmin;
  const canChangeRole = isSuperAdmin && !isOwnRow && !isTargetSuperAdmin;
  const deleteDisabled = isTargetSuperAdmin;

  function handleRoleSelectChange(value: string) {
    if (value !== ROLE.admin && value !== ROLE.user) return;
    void onRoleChange({ role: value, userId: user.id });
  }

  return (
    <TableRow className="group/row h-14 animate-in duration-300 fill-mode-both fade-in hover:bg-muted/30">
      <TableCell className="px-4 py-3 text-sm font-medium text-foreground first:pl-6">
        {user.login}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
        <div className="flex items-center gap-2">
          <span>{user.email}</span>
          <button
            aria-label={t("users.list.copyEmail")}
            className="cursor-pointer rounded-md p-1 text-muted-foreground/70 opacity-0 transition-all duration-150 group-hover/row:opacity-100 hover:bg-muted hover:text-primary focus-visible:opacity-100"
            data-user-email={user.email}
            onClick={onCopyEmail}
            type="button"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        {canChangeRole ? (
          <Select
            disabled={roleChangePending}
            onValueChange={handleRoleSelectChange}
            value={user.role}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROLE.user}>User</SelectItem>
              <SelectItem value={ROLE.admin}>Admin</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={user.role} />
        )}
      </TableCell>
      <TableCell className="hidden px-4 py-3 md:table-cell">
        <div className="flex items-center gap-2">
          <span
            aria-label={user.id}
            className="font-mono text-xs text-muted-foreground tabular-nums"
            title={user.id}
          >
            {truncateUserId(user.id)}
          </span>
          <button
            aria-label={t("users.list.copyId")}
            className="cursor-pointer rounded-md p-1 text-muted-foreground/70 opacity-0 transition-all duration-150 group-hover/row:opacity-100 hover:bg-muted hover:text-primary focus-visible:opacity-100"
            data-user-id={user.id}
            onClick={onCopyId}
            type="button"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      </TableCell>
      <TableCell className="hidden px-4 py-3 text-sm text-muted-foreground tabular-nums lg:table-cell">
        {formatTimestamp(user.createdAt)}
      </TableCell>
      <TableCell className="px-4 py-3 text-right last:pr-6">
        {deleteDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <button
                  aria-label={t("users.list.cannotDeleteSuperAdmin")}
                  className="pointer-events-none inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground opacity-40"
                  disabled
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("users.list.cannotDeleteSuperAdmin")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            aria-label={t("users.delete.title", { login: user.login })}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:outline-none"
            data-user-id={user.id}
            data-user-login={user.login}
            onClick={onDeleteClick}
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </TableCell>
    </TableRow>
  );
}
