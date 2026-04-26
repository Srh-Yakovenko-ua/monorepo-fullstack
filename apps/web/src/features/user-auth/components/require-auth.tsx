import { Navigate, Outlet, useLocation } from "react-router";

import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

export function RequireAuth() {
  const { isAuthed, isLoading } = useUserAuth();
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
  if (!isAuthed) {
    return <Navigate replace to={`/login?next=${encodeURIComponent(location.pathname)}`} />;
  }
  return <Outlet />;
}
