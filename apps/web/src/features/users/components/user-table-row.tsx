import type { UpdateUserRoleInput, UserViewModel } from "@app/shared";

import { ROLE } from "@app/shared";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RoleBadge } from "@/features/user-auth/components/role-badge";
import { CopyButton } from "@/features/users/components/copy-button";
import { truncateUserId } from "@/features/users/lib/user-id";
import { formatTimestamp } from "@/lib/format";

type UserTableRowProps = {
  currentUserId: null | string;
  isSuperAdmin: boolean;
  onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRoleChange: (params: { role: UpdateUserRoleInput["role"]; userId: string }) => void;
  roleChangePending: boolean;
  user: UserViewModel;
};

export function UserTableRow({
  currentUserId,
  isSuperAdmin,
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
          <CopyButton
            ariaLabel={t("users.list.copyEmail")}
            toastMessage={t("users.list.emailCopied")}
            value={user.email}
          />
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
          <CopyButton
            ariaLabel={t("users.list.copyId")}
            toastMessage={t("users.list.idCopied")}
            value={user.id}
          />
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
                <Button
                  aria-label={t("users.list.cannotDeleteSuperAdmin")}
                  className="text-muted-foreground"
                  disabled
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("users.list.cannotDeleteSuperAdmin")}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            aria-label={t("users.delete.title", { login: user.login })}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:ring-destructive/30"
            data-user-id={user.id}
            data-user-login={user.login}
            onClick={onDeleteClick}
            size="icon"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
