import type { UpdateUserRoleInput } from "@app/shared";

import { ROLE } from "@app/shared";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ModalId, modalObserver } from "@/features/modals";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";
import { UsersFilters } from "@/features/users/components/users-filters";
import { UsersPagination } from "@/features/users/components/users-pagination";
import { UsersTable } from "@/features/users/components/users-table";
import { useDeleteUser, useUpdateUserRole } from "@/features/users/hooks/use-user-mutations";
import { useUsers } from "@/features/users/hooks/use-users";
import { useUsersTableState } from "@/features/users/hooks/use-users-table-state";
import { usePageTitle } from "@/hooks/use-page-title";

export function UsersPage() {
  const { t } = useTranslation();
  usePageTitle(t("users.list.title"));

  const { user: currentUser } = useUserAuth();
  const isSuperAdmin = currentUser?.role === ROLE.superAdmin;

  const {
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
  } = useUsersTableState();

  const deleteUser = useDeleteUser();
  const updateUserRole = useUpdateUserRole();

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

  function handleOpenCreate() {
    modalObserver.addModal(ModalId.UserForm, {});
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

  return (
    <main className="relative flex h-[calc(100dvh-var(--shell-header-height))] flex-col overflow-hidden px-5 pb-6 md:px-8 md:pb-8 lg:px-12">
      <UsersFilters
        emailInput={emailInput}
        loginInput={loginInput}
        onAddClick={handleOpenCreate}
        onEmailInputChange={handleEmailInputChange}
        onLoginInputChange={handleLoginInputChange}
        onSortChange={handleSortChange}
        onSortClear={handleSortClear}
        sortValue={sortValue}
      />

      <section className="mt-5 flex min-h-0 flex-1 flex-col">
        <UsersTable
          currentUserId={currentUser?.userId ?? null}
          error={error}
          hasSearchTerms={hasSearchTerms}
          isError={isError}
          isFetching={isFetching}
          isLoading={isLoading}
          isSuperAdmin={isSuperAdmin}
          onColumnSortClick={handleColumnSortClick}
          onDeleteClick={handleDeleteClick}
          onRoleChange={handleRoleChange}
          roleChangePending={updateUserRole.isPending}
          sortValue={sortValue}
          users={users}
        />

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
