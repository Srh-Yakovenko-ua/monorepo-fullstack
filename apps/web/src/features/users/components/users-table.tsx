import type { UpdateUserRoleInput, UserViewModel } from "@app/shared";

import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/features/users/components/sortable-header";
import { UserTableRow } from "@/features/users/components/user-table-row";
import { COLUMN, type UserSortValue } from "@/features/users/lib/sort";
import { cn } from "@/lib/utils";

const SKELETON_ROW_COUNT = 5;

type UsersTableProps = {
  currentUserId: null | string;
  error: Error | null;
  hasSearchTerms: boolean;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  onColumnSortClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRoleChange: (params: { role: UpdateUserRoleInput["role"]; userId: string }) => void;
  roleChangePending: boolean;
  sortValue: UserSortValue;
  users: UserViewModel[];
};

export function UsersTable({
  currentUserId,
  error,
  hasSearchTerms,
  isError,
  isFetching,
  isLoading,
  isSuperAdmin,
  onColumnSortClick,
  onDeleteClick,
  onRoleChange,
  roleChangePending,
  sortValue,
  users,
}: UsersTableProps) {
  const { t } = useTranslation();

  const tableHeader = (
    <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm [&_tr]:border-b">
      <TableRow>
        <SortableHeader
          column={COLUMN.login}
          currentSort={sortValue}
          label={t("users.list.columns.username")}
          onSortClick={onColumnSortClick}
        />
        <SortableHeader
          column={COLUMN.email}
          currentSort={sortValue}
          label={t("users.list.columns.email")}
          onSortClick={onColumnSortClick}
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
          onSortClick={onColumnSortClick}
        />
        <TableHead className="h-12 w-16 px-4 text-right font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase first:pl-6 last:pr-6">
          <span className="sr-only">{t("users.list.columns.actions")}</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  if (isLoading) {
    return (
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
    );
  }

  if (isError) {
    return (
      <div className="animate-in rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md duration-500 fill-mode-both fade-in">
        <p
          className="font-display text-base font-normal text-destructive"
          style={{ letterSpacing: "-0.02em" }}
        >
          {t("users.list.error")}
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {error?.message}
        </p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
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
    );
  }

  return (
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
              currentUserId={currentUserId}
              isSuperAdmin={isSuperAdmin}
              key={user.id}
              onDeleteClick={onDeleteClick}
              onRoleChange={onRoleChange}
              roleChangePending={roleChangePending}
              user={user}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
