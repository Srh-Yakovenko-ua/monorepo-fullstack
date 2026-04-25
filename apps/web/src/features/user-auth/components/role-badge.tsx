import type { UserRole } from "@app/shared";

import { ROLE } from "@app/shared";

import { Badge } from "@/components/ui/badge";

type RoleBadgeProps = {
  role: UserRole;
};

const ROLE_LABEL: Record<UserRole, string> = {
  [ROLE.admin]: "Admin",
  [ROLE.superAdmin]: "Super Admin",
  [ROLE.user]: "User",
} as const;

const ROLE_VARIANT = {
  [ROLE.admin]: "secondary",
  [ROLE.superAdmin]: "default",
  [ROLE.user]: "outline",
} as const satisfies Record<UserRole, "default" | "outline" | "secondary">;

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
