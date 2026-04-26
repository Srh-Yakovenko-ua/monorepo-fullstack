import type { UserRole } from "@app/shared";

import { Navigate, Outlet, useLocation } from "react-router";

import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

type Props = {
  allow: readonly UserRole[];
};

export function RequireRole({ allow }: Props) {
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
  return <Outlet />;
}
