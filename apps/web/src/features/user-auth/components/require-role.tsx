import type { UserRole } from "@app/shared";
import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router";

import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

type Props = {
  allow: readonly UserRole[];
  children: ReactNode;
};

export function RequireRole({ allow, children }: Props) {
  const { isAuthed, isLoading, user } = useUserAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className="flex flex-1 items-center justify-center p-8"
      >
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!isAuthed || !user) {
    return <Navigate replace to={`/login?next=${encodeURIComponent(location.pathname)}`} />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate replace to="/" />;
  }
  return <>{children}</>;
}
